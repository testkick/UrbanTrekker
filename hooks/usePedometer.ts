import { useState, useEffect, useCallback, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

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

  const resetSteps = useCallback(() => {
    // Reset base steps to current raw value (effectively zeroing displayed steps)
    setBaseSteps(rawStepsRef.current);
    setSteps(0);
    console.log('Steps reset at midnight or manually');
  }, []);

  // Midnight reset check
  useEffect(() => {
    const checkMidnight = () => {
      const currentDate = getDateString();

      if (currentDate !== lastCheckDateRef.current) {
        console.log(`Day changed from ${lastCheckDateRef.current} to ${currentDate}, resetting steps`);
        lastCheckDateRef.current = currentDate;
        resetSteps();

        // Re-fetch today's steps from pedometer
        (async () => {
          try {
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);

            const pastStepsResult = await Pedometer.getStepCountAsync(start, end);
            if (pastStepsResult) {
              rawStepsRef.current = pastStepsResult.steps;
              setSteps(pastStepsResult.steps);
              setBaseSteps(0);
            }
          } catch (e) {
            console.log('Could not refresh step data after midnight');
          }
        })();
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

        // Get step count from midnight today
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        try {
          const pastStepsResult = await Pedometer.getStepCountAsync(start, end);
          if (pastStepsResult) {
            rawStepsRef.current = pastStepsResult.steps;
            setSteps(pastStepsResult.steps);
            setBaseSteps(0);
          }
        } catch (e) {
          // Historical data might not be available
          console.log('Could not get historical step data');
        }

        // Subscribe to live step updates
        subscription = Pedometer.watchStepCount((result) => {
          rawStepsRef.current = result.steps;
          setSteps(result.steps);
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
  }, []);

  return {
    steps: steps - baseSteps,
    isAvailable,
    isPedometerAvailable,
    errorMsg,
    resetSteps,
  };
};

export default usePedometer;
