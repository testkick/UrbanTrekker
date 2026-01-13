import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { LocationSmoother, SmoothedLocation } from '@/utils/locationSmoothing';

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  // Raw coordinates for debugging/diagnostics
  rawLatitude?: number;
  rawLongitude?: number;
  isSignificantMovement?: boolean;
}

interface UseLocationResult {
  location: LocationState | null;
  errorMsg: string | null;
  isLoading: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

const DEFAULT_LOCATION: LocationState = {
  latitude: 37.78825,
  longitude: -122.4324,
  accuracy: null,
  heading: null,
};

/**
 * High-Fidelity Location Hook
 * Premium GPS tracking with Kalman filtering and intelligent smoothing
 * Provides jitter-free, navigation-grade location updates
 */
export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Location smoother instance (persists across renders)
  const smootherRef = useRef<LocationSmoother>(
    new LocationSmoother({
      maxHistorySize: 5,
      deadZoneRadius: 2.5, // 2.5 meters - ignore tiny jitters
      movementThreshold: 1.5, // 1.5 meters - significant movement
    })
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable it in settings.');
        setHasPermission(false);
        setIsLoading(false);
        return false;
      }

      setHasPermission(true);
      return true;
    } catch (error) {
      setErrorMsg('Failed to request location permission');
      setHasPermission(false);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      const granted = await requestPermission();

      if (!granted) {
        // Use default location for preview
        setLocation(DEFAULT_LOCATION);
        setIsLoading(false);
        return;
      }

      try {
        // Get initial location with highest accuracy
        console.log('🎯 Starting high-fidelity location tracking...');
        console.log('📍 Accuracy: BestForNavigation');
        console.log('🔄 Smoothing: Kalman Filter + Weighted Moving Average');
        console.log('🚫 Dead-zone: 2.5m (filters GPS noise)');

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        // Apply smoothing to initial location
        const smoothed = smootherRef.current.smooth({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: currentLocation.timestamp,
        });

        setLocation({
          latitude: smoothed.latitude,
          longitude: smoothed.longitude,
          accuracy: currentLocation.coords.accuracy,
          heading: currentLocation.coords.heading,
          rawLatitude: currentLocation.coords.latitude,
          rawLongitude: currentLocation.coords.longitude,
          isSignificantMovement: smoothed.isSignificantMovement,
        });

        console.log('✅ Initial location acquired and smoothed');

        // Subscribe to location updates with premium settings
        locationSubscription = await Location.watchPositionAsync(
          {
            // BEST FOR NAVIGATION: Highest precision for movement tracking
            accuracy: Location.Accuracy.BestForNavigation,
            // Frequent updates for smooth tracking
            timeInterval: 1000, // Update every 1 second (reduced from 5s)
            // Lower distance threshold for finer tracking
            distanceInterval: 3, // Update when moved 3 meters (reduced from 10m)
          },
          (newLocation) => {
            // Apply intelligent smoothing to raw GPS coordinates
            const smoothed = smootherRef.current.smooth({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy,
              timestamp: newLocation.timestamp,
            });

            // Update location state with smoothed coordinates
            setLocation({
              latitude: smoothed.latitude,
              longitude: smoothed.longitude,
              accuracy: newLocation.coords.accuracy,
              heading: newLocation.coords.heading,
              rawLatitude: newLocation.coords.latitude,
              rawLongitude: newLocation.coords.longitude,
              isSignificantMovement: smoothed.isSignificantMovement,
            });
          }
        );

        console.log('🎯 Location tracking active - Premium navigation mode');
      } catch (error) {
        console.error('❌ Failed to get location:', error);
        setErrorMsg('Failed to get location');
        setLocation(DEFAULT_LOCATION);
      } finally {
        setIsLoading(false);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        console.log('🛑 Stopping location tracking');
        locationSubscription.remove();
      }
    };
  }, [requestPermission]);

  return {
    location,
    errorMsg,
    isLoading,
    hasPermission,
    requestPermission,
  };
};

export default useLocation;
