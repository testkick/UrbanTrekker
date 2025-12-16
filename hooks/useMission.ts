import { useState, useCallback, useRef } from 'react';
import { Mission, ActiveMission, MissionState, RouteCoordinate } from '@/types/mission';
import { generateMissions, getLocationName } from '@/services/missionGenerator';
import { generateRewardText } from '@/services/rewardGenerator';
import {
  saveCompletedMission,
  updateStatsAfterMission,
  saveScanLocation,
  CompletedMission,
} from '@/services/storage';

// Minimum distance in meters between recorded GPS points
const MIN_DISTANCE_METERS = 5;

// Location context for missions
interface LocationContext {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two GPS coordinates in meters using Haversine formula
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface UseMissionResult {
  state: MissionState;
  missions: Mission[];
  activeMission: ActiveMission | null;
  error: string | null;
  /** Scan for missions with optional location for context-aware generation */
  scanForMissions: (location?: LocationContext) => Promise<void>;
  selectMission: (mission: Mission, currentSteps: number) => void;
  updateMissionProgress: (currentSteps: number) => void;
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

      // Pass location to generateMissions for context-aware mission generation
      const generatedMissions = await generateMissions(location);
      setMissions(generatedMissions);
      setState('selecting');
    } catch (err) {
      console.error('Error scanning for missions:', err);
      setError('Failed to generate missions. Please try again.');
      setState('idle');
    }
  }, [state]);

  // Select a mission and start tracking
  const selectMission = useCallback((mission: Mission, currentSteps: number) => {
    const active: ActiveMission = {
      ...mission,
      startedAt: new Date(),
      stepsAtStart: currentSteps,
      currentSteps: currentSteps,
      isCompleted: false,
      rewardText: undefined,
      isGeneratingReward: false,
      routeCoordinates: [], // Initialize empty route
    };

    // Reset the last coordinate ref
    lastCoordinateRef.current = null;

    setActiveMission(active);
    setMissions([]);
    setState('active');
  }, []);

  // Update mission progress with current step count
  const updateMissionProgress = useCallback((currentSteps: number) => {
    setActiveMission((prev) => {
      if (!prev) return null;

      const stepsInMission = currentSteps - prev.stepsAtStart;
      const isCompleted = stepsInMission >= prev.stepTarget;

      return {
        ...prev,
        currentSteps,
        isCompleted,
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

      // Save to storage (includes route coordinates)
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
      };

      await Promise.all([
        saveCompletedMission(completedMission),
        updateStatsAfterMission(stepsCompleted),
      ]);

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
