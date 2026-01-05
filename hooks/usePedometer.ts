import { useState, useEffect, useCallback, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform, AppState, AppStateStatus } from 'react-native';

// Interval for midnight check (1 minute)
const MIDNIGHT_CHECK_INTERVAL_MS = 60000;

/**
 * Get the current date as a string (YYYY-MM-DD) for comparison
 */
const getDateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

interface UsePedometerResult {
  steps: number;
  isAvailable: boolean;
  isPedometerAvailable: string;
  errorMsg: string | null;
  resetSteps: () => void;
}

export const usePedometer = (): UsePedometerResult => {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [baseSteps, setBaseSteps] = useState(0);

  // Track the last check date for midnight reset
  const lastCheckDateRef = useRef<string>(getDateString());

  // Store raw steps from pedometer for midnight reset calculation
  const rawStepsRef = useRef<number>(0);

  /**
   * Fetch step count from midnight of current day until now
   * This ensures we always display the user's actual daily total
   */
  const fetchTodaySteps = useCallback(async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const pastStepsResult = await Pedometer.getStepCountAsync(start, end);
      if (pastStepsResult && pastStepsResult.steps >= 0) {
        console.log(`Fetched today's steps from midnight: ${pastStepsResult.steps}`);
        rawStepsRef.current = pastStepsResult.steps;
        setSteps(pastStepsResult.steps);
        setBaseSteps(0);
        return pastStepsResult.steps;
      }
    } catch (e) {
      console.log('Could not fetch today\'s step data:', e);
    }
    return 0;
  }, []);

  const resetSteps = useCallback(async () => {
    // Reset base steps to current raw value (effectively zeroing displayed steps)
    setBaseSteps(rawStepsRef.current);
    setSteps(0);
    console.log('Steps reset at midnight or manually');

    // Re-fetch today's steps from midnight
    await fetchTodaySteps();
  }, [fetchTodaySteps]);

  // App State listener - Re-sync steps when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App became active, re-syncing step data from midnight');
        // Re-fetch today's steps whenever app comes to foreground
        await fetchTodaySteps();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [fetchTodaySteps]);

  // Midnight reset check
  useEffect(() => {
    const checkMidnight = async () => {
      const currentDate = getDateString();

      if (currentDate !== lastCheckDateRef.current) {
        console.log(`Day changed from ${lastCheckDateRef.current} to ${currentDate}, resetting steps`);
        lastCheckDateRef.current = currentDate;
        await resetSteps();
      }
    };

    // Initial check
    checkMidnight();

    // Set up interval for midnight check
    const intervalId = setInterval(checkMidnight, MIDNIGHT_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [resetSteps]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let watchStartSteps = 0; // Track steps when watch started
    let dailyBaseSteps = 0; // Track the daily total when watch started

    const subscribe = async () => {
      try {
        // Check if pedometer is available
        const available = await Pedometer.isAvailableAsync();
        setIsAvailable(available);
        setIsPedometerAvailable(available ? 'available' : 'unavailable');

        if (!available) {
          // Only show error on native platforms where pedometer should be available
          if (Platform.OS !== 'web') {
            setErrorMsg('Pedometer is not available on this device. Steps will not be tracked.');
          } else {
            // On web, just note it's unavailable but don't show error
            setIsPedometerAvailable('unavailable_web');
          }
          // NO FAKE DATA - if pedometer isn't available, steps stay at 0
          return;
        }

        // Request permission (iOS)
        const permission = await Pedometer.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          setErrorMsg('Motion permission denied. Please enable it in settings.');
          return;
        }

        // Get step count from midnight today - this ensures we display the user's
        // actual daily total immediately upon app launch
        const todaySteps = await fetchTodaySteps();
        dailyBaseSteps = todaySteps;

        // Subscribe to live step updates
        // watchStepCount returns incremental steps since the subscription started
        subscription = Pedometer.watchStepCount((result) => {
          // First update from watchStepCount - record the baseline
          if (watchStartSteps === 0) {
            watchStartSteps = result.steps;
          }

          // Calculate the new steps since watch started
          const newStepsSinceWatch = result.steps - watchStartSteps;

          // Update the total: daily base + new steps since watch started
          const updatedTotal = dailyBaseSteps + newStepsSinceWatch;

          rawStepsRef.current = updatedTotal;
          setSteps(updatedTotal);

          console.log(`Live update: Base=${dailyBaseSteps}, Watch delta=${newStepsSinceWatch}, Total=${updatedTotal}`);
        });
      } catch (error) {
        setErrorMsg('Failed to initialize pedometer');
        console.error('Pedometer error:', error);
      }
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [fetchTodaySteps]);

  return {
    steps: steps - baseSteps,
    isAvailable,
    isPedometerAvailable,
    errorMsg,
    resetSteps,
  };
};

export default usePedometer;
