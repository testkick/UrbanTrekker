import { useState, useCallback, useRef } from 'react';
import { Mission, ActiveMission, MissionState, RouteCoordinate } from '@/types/mission';
import { generateMissionsWithRealPOIs, getLocationName } from '@/services/missionGenerator';
import { generateRewardText } from '@/services/rewardGenerator';
import {
  saveCompletedMission,
  updateStatsAfterMission,
  saveScanLocation,
  CompletedMission,
} from '@/services/storage';
import { findPOIInDirection } from '@/services/googlePlaces';
import { getWalkingDirections } from '@/services/googleDirections';
import { calculateDistance as calculateHaversineDistance, calculateRemainingPathDistance } from '@/utils/pathDistance';

// Minimum distance in meters between recorded GPS points
const MIN_DISTANCE_METERS = 5;

// Location context for missions
interface LocationContext {
  latitude: number;
  longitude: number;
}

// Use calculateHaversineDistance from utils/pathDistance.ts
const calculateDistance = calculateHaversineDistance;

/**
 * Project a coordinate at a given distance and bearing from a start point
 * Uses reverse Haversine formula for destination point calculation
 *
 * @param lat Starting latitude in degrees
 * @param lon Starting longitude in degrees
 * @param distance Distance to travel in meters
 * @param bearing Direction in degrees from north (0-360)
 * @returns New coordinate {latitude, longitude}
 */
const projectCoordinate = (
  lat: number,
  lon: number,
  distance: number,
  bearing: number
): { latitude: number; longitude: number } => {
  const R = 6371000; // Earth's radius in meters
  const angularDistance = distance / R;

  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const bearingRad = (bearing * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };
};

/**
 * Estimate walking distance in meters based on step count
 * Average stride length: 0.762 meters (2.5 feet) per step
 */
const estimateDistance = (steps: number): number => {
  const AVERAGE_STRIDE_METERS = 0.762;
  return steps * AVERAGE_STRIDE_METERS;
};

interface UseMissionResult {
  state: MissionState;
  missions: Mission[];
  activeMission: ActiveMission | null;
  error: string | null;
  /** Scan for missions with optional location for context-aware generation */
  scanForMissions: (location?: LocationContext) => Promise<void>;
  selectMission: (mission: Mission, currentSteps: number, currentLocation: LocationContext) => Promise<void>;
  updateMissionProgress: (currentSteps: number, currentLocation?: LocationContext) => void;
  /** Add a GPS coordinate to the active mission's route */
  addRoutePoint: (latitude: number, longitude: number) => void;
  completeMission: () => void;
  cancelMission: () => void;
  dismissMissions: () => void;
}

export const useMission = (): UseMissionResult => {
  const [state, setState] = useState<MissionState>('idle');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref to track last recorded coordinate for distance filtering
  const lastCoordinateRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Scan for new missions using AI with optional location context
  const scanForMissions = useCallback(async (location?: LocationContext) => {
    if (state === 'scanning' || state === 'active') {
      return;
    }

    try {
      setState('scanning');
      setError(null);

      // If location is provided, log it to Supabase (fire-and-forget)
      if (location) {
        // Get location name and save scan location in parallel with mission generation
        // This is fire-and-forget - we don't await it to avoid blocking the UI
        getLocationName(location)
          .then((contextName) => {
            saveScanLocation(
              { latitude: location.latitude, longitude: location.longitude },
              contextName
            );
          })
          .catch((err) => {
            console.log('Failed to save scan location:', err);
          });
      }

      // Pass location to enhanced HIGH-QUALITY DISCOVERY ENGINE
      // This will search for real POIs and generate missions to them
      const generatedMissions = await generateMissionsWithRealPOIs(location);
      setMissions(generatedMissions);
      setState('selecting');
    } catch (err) {
      console.error('Error scanning for missions:', err);
      setError('Failed to generate missions. Please try again.');
      setState('idle');
    }
  }, [state]);

  // Select a mission and start tracking
  const selectMission = useCallback(async (mission: Mission, currentSteps: number, currentLocation: LocationContext) => {
    try {
      // Set state to 'active' immediately to show loading state
      setState('active');
      setMissions([]);

      let goalCoord: { latitude: number; longitude: number };
      let poiName: string | undefined;
      let poiAddress: string | undefined;
      let streetPath: RouteCoordinate[] | undefined;

      // ENHANCED: Check if mission has real POI data from discovery engine
      if (mission.realPOI) {
        console.log(`🏆 Using real POI from discovery engine: ${mission.realPOI.name}`);
        goalCoord = {
          latitude: mission.realPOI.latitude,
          longitude: mission.realPOI.longitude,
        };
        poiName = mission.realPOI.name;
        poiAddress = mission.realPOI.address;
      } else {
        // Legacy path: Calculate coordinate based on step target and bearing
        console.log('⚠️ No realPOI data, using legacy projection method');
        const estimatedDistanceMeters = estimateDistance(mission.stepTarget);
        goalCoord = projectCoordinate(
          currentLocation.latitude,
          currentLocation.longitude,
          estimatedDistanceMeters,
          mission.targetBearing
        );

        // Try to find a real POI matching the destination type
        console.log(`🔍 Searching for ${mission.destinationType} POI...`);
        const poiResult = await findPOIInDirection(
          currentLocation,
          mission.targetBearing,
          estimatedDistanceMeters,
          mission.destinationType
        );

        if (poiResult.success && poiResult.poi) {
          console.log(`✅ Found POI: ${poiResult.poi.name}`);
          // Snap goal to the actual POI location
          goalCoord = {
            latitude: poiResult.poi.latitude,
            longitude: poiResult.poi.longitude,
          };
          poiName = poiResult.poi.name;
          poiAddress = poiResult.poi.address;
        } else {
          console.log('⚠️ No POI found, using projected coordinate');
        }
      }

      // Create goal coordinate with timestamp
      const goalCoordinate: RouteCoordinate = {
        latitude: goalCoord.latitude,
        longitude: goalCoord.longitude,
        timestamp: Date.now(),
      };

      // Fetch street-following path using Google Directions API
      console.log('🗺️ Fetching walking directions from Google Directions API...');
      console.log(`  Origin: (${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)})`);
      console.log(`  Destination: (${goalCoord.latitude.toFixed(6)}, ${goalCoord.longitude.toFixed(6)})`);

      const directionsResult = await getWalkingDirections(currentLocation, goalCoord);

      if (directionsResult.success && directionsResult.path) {
        console.log(`✅ Got street path with ${directionsResult.path.length} points`);
        console.log(`  Distance: ${directionsResult.distance}m, Duration: ${directionsResult.duration}s`);
        streetPath = directionsResult.path;
      } else {
        console.warn('⚠️ Directions API failed:', directionsResult.error);
        console.warn('  Falling back to straight line path');
        console.warn('  The blue path will be shown as a direct line to the destination');
        // No need to throw - we'll gracefully fall back to straight line
      }

      // Calculate initial distance to goal
      // Use street path distance if available, otherwise straight line
      let distanceToGoal: number;
      if (streetPath && streetPath.length > 0) {
        distanceToGoal = calculateRemainingPathDistance(currentLocation, streetPath);
        console.log(`📏 Initial distance along street path: ${Math.round(distanceToGoal)}m`);
      } else {
        distanceToGoal = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          goalCoordinate.latitude,
          goalCoordinate.longitude
        );
        console.log(`📏 Initial straight-line distance: ${Math.round(distanceToGoal)}m`);
      }

      const active: ActiveMission = {
        ...mission,
        startedAt: new Date(),
        stepsAtStart: currentSteps,
        currentSteps: currentSteps,
        isCompleted: false,
        rewardText: undefined,
        isGeneratingReward: false,
        routeCoordinates: [], // Initialize empty route
        goalCoordinate,
        distanceToGoal,
        streetPath,
        poiName,
        poiAddress,
        hasArrived: false,
      };

      // Reset the last coordinate ref
      lastCoordinateRef.current = null;

      setActiveMission(active);
      console.log('✅ Mission activated successfully!');
    } catch (error) {
      console.error('❌ Error selecting mission:', error);
      setError('Failed to start mission. Please try again.');
      setState('idle');
    }
  }, []);

  // Update mission progress with current step count and location
  const updateMissionProgress = useCallback((currentSteps: number, currentLocation?: LocationContext) => {
    setActiveMission((prev) => {
      if (!prev) return null;

      const stepsInMission = currentSteps - prev.stepsAtStart;

      // Check for step-based completion
      const stepsCompleted = stepsInMission >= prev.stepTarget;

      // Update distance to goal if location is provided
      let distanceToGoal = prev.distanceToGoal;
      let proximityCompleted = false;
      let completionType = prev.completionType;

      if (currentLocation && prev.goalCoordinate) {
        // Calculate actual straight-line distance for proximity detection
        const straightLineDistance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          prev.goalCoordinate.latitude,
          prev.goalCoordinate.longitude
        );

        // If we have a street path, calculate remaining distance along the path
        // Otherwise, use straight-line distance
        if (prev.streetPath && prev.streetPath.length > 0) {
          distanceToGoal = calculateRemainingPathDistance(currentLocation, prev.streetPath);
          console.log('📏 Street path distance update:', {
            straightLine: Math.round(straightLineDistance),
            alongPath: Math.round(distanceToGoal),
            pathPoints: prev.streetPath.length,
          });
        } else {
          distanceToGoal = straightLineDistance;
        }

        // Check for proximity-based completion (within 20 meters)
        // Always use straight-line distance for arrival detection to avoid path calculation errors
        const PROXIMITY_THRESHOLD_METERS = 20;
        proximityCompleted = straightLineDistance <= PROXIMITY_THRESHOLD_METERS;

        // Set completion type based on how mission was completed
        if (proximityCompleted && !prev.isCompleted) {
          completionType = 'proximity';
        } else if (stepsCompleted && !prev.isCompleted) {
          completionType = 'steps';
        }
      }

      // Mission is completed if either condition is met
      const isCompleted = stepsCompleted || proximityCompleted;

      // Check if user has arrived at destination (within 20m) for Discovery Card
      const hasArrived = proximityCompleted;

      return {
        ...prev,
        currentSteps,
        isCompleted,
        distanceToGoal,
        completionType,
        hasArrived,
      };
    });
  }, []);

  // Add a GPS coordinate to the active mission's route
  const addRoutePoint = useCallback((latitude: number, longitude: number) => {
    // Only record when mission is active
    if (state !== 'active') {
      return;
    }

    // Apply distance filter
    if (lastCoordinateRef.current) {
      const distance = calculateDistance(
        lastCoordinateRef.current.latitude,
        lastCoordinateRef.current.longitude,
        latitude,
        longitude
      );

      // Skip if too close to last recorded point
      if (distance < MIN_DISTANCE_METERS) {
        return;
      }
    }

    // Update last coordinate
    lastCoordinateRef.current = { latitude, longitude };

    // Create the route point
    const routePoint: RouteCoordinate = {
      latitude,
      longitude,
      timestamp: Date.now(),
    };

    // Add to active mission's route
    setActiveMission((prev) => {
      if (!prev) return null;

      return {
        ...prev,
        routeCoordinates: [...prev.routeCoordinates, routePoint],
      };
    });
  }, [state]);

  // Complete the current mission with AI reward generation
  const completeMission = useCallback(async () => {
    if (!activeMission) return;

    const stepsCompleted = activeMission.currentSteps - activeMission.stepsAtStart;

    // Set generating state
    setActiveMission({
      ...activeMission,
      isCompleted: true,
      isGeneratingReward: true,
    });
    setState('completed');

    try {
      // Generate reward text using AI
      const rewardText = await generateRewardText(
        activeMission.title,
        activeMission.vibe,
        stepsCompleted
      );

      // Calculate duration
      const startTime = new Date(activeMission.startedAt).getTime();
      const endTime = Date.now();
      const durationMinutes = Math.round((endTime - startTime) / 60000);

      // Save to storage (includes route coordinates and high-quality discovery data)
      const completedMission: CompletedMission = {
        id: activeMission.id,
        title: activeMission.title,
        description: activeMission.description,
        vibe: activeMission.vibe,
        stepTarget: activeMission.stepTarget,
        stepsCompleted,
        rewardText,
        completedAt: new Date().toISOString(),
        durationMinutes,
        routeCoordinates: activeMission.routeCoordinates,

        // High-Quality Discovery Engine fields
        // Extract POI data from mission if available
        poiName: activeMission.poiName,
        poiAddress: activeMission.poiAddress,
        poiRating: activeMission.realPOI?.rating,
        poiReviewCount: activeMission.realPOI?.userRatingsTotal,
        poiIsOpenNow: activeMission.realPOI?.isOpenNow,
        poiPlaceId: activeMission.realPOI?.placeId,
        poiLatitude: activeMission.realPOI?.latitude,
        poiLongitude: activeMission.realPOI?.longitude,

        // AI narrative data
        destinationType: activeMission.destinationType,
        destinationArchetype: activeMission.destinationArchetype,
        destinationNarrative: activeMission.destinationNarrative,

        // Completion metrics
        completionType: activeMission.completionType,
        environmentType: activeMission.environmentType,
      };

      await Promise.all([
        saveCompletedMission(completedMission),
        updateStatsAfterMission(stepsCompleted),
      ]);

      // ROTATION ENGINE: Mark this place as completed in history
      if (activeMission.realPOI) {
        try {
          const { addToQuestHistory } = await import('@/services/questRotation');
          await addToQuestHistory(activeMission.realPOI.placeId, true); // true = completed
          console.log(`✅ Marked ${activeMission.realPOI.name} as completed in rotation history`);
        } catch (err) {
          console.warn('Failed to update quest rotation history:', err);
        }
      }

      // Update active mission with reward
      setActiveMission((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          rewardText,
          isGeneratingReward: false,
        };
      });
    } catch (err) {
      console.error('Error completing mission:', err);
      // Still show completion but with default reward
      setActiveMission((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          rewardText: 'Your adventure was a success! Every step brought you closer to mastery.',
          isGeneratingReward: false,
        };
      });
    }
  }, [activeMission]);

  // Cancel the current mission
  const cancelMission = useCallback(() => {
    lastCoordinateRef.current = null;
    setActiveMission(null);
    setState('idle');
  }, []);

  // Dismiss mission selection without choosing
  const dismissMissions = useCallback(() => {
    setMissions([]);
    setState('idle');
  }, []);

  return {
    state,
    missions,
    activeMission,
    error,
    scanForMissions,
    selectMission,
    updateMissionProgress,
    addRoutePoint,
    completeMission,
    cancelMission,
    dismissMissions,
  };
};

export default useMission;
