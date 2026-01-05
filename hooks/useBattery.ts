import { useState, useEffect } from 'react';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';

/**
 * Battery level update interval (in milliseconds)
 * Checking every 30 seconds to balance real-time updates with efficiency
 */
const BATTERY_UPDATE_INTERVAL_MS = 30000;

interface UseBatteryResult {
  batteryLevel: number; // 0.0 to 1.0
  batteryState: Battery.BatteryState;
  isAvailable: boolean;
  errorMsg: string | null;
}

export const useBattery = (): UseBatteryResult => {
  const [batteryLevel, setBatteryLevel] = useState<number>(1.0);
  const [batteryState, setBatteryState] = useState<Battery.BatteryState>(Battery.BatteryState.UNKNOWN);
  const [isAvailable, setIsAvailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let batteryLevelSubscription: Battery.Subscription | null = null;
    let batteryStateSubscription: Battery.Subscription | null = null;

    const initializeBattery = async () => {
      try {
        // Web platform doesn't have reliable battery API
        if (Platform.OS === 'web') {
          setIsAvailable(false);
          setErrorMsg(null); // Don't show error on web
          // Default to 100% on web
          setBatteryLevel(1.0);
          return;
        }

        // Get initial battery level
        const initialLevel = await Battery.getBatteryLevelAsync();
        if (isMounted && initialLevel >= 0) {
          setBatteryLevel(initialLevel);
          setIsAvailable(true);
        }

        // Get initial battery state
        const initialState = await Battery.getBatteryStateAsync();
        if (isMounted) {
          setBatteryState(initialState);
        }

        // Subscribe to battery level changes
        batteryLevelSubscription = Battery.addBatteryLevelListener(({ batteryLevel: level }) => {
          if (isMounted && level >= 0) {
            setBatteryLevel(level);
          }
        });

        // Subscribe to battery state changes (charging/unplugged/full)
        batteryStateSubscription = Battery.addBatteryStateListener(({ batteryState: state }) => {
          if (isMounted) {
            setBatteryState(state);
          }
        });

      } catch (error) {
        if (isMounted) {
          setErrorMsg('Unable to access battery information');
          setIsAvailable(false);
          // Default to 100% if battery info is unavailable
          setBatteryLevel(1.0);
          console.error('Battery monitoring error:', error);
        }
      }
    };

    initializeBattery();

    return () => {
      isMounted = false;
      if (batteryLevelSubscription) {
        batteryLevelSubscription.remove();
      }
      if (batteryStateSubscription) {
        batteryStateSubscription.remove();
      }
    };
  }, []);

  return {
    batteryLevel,
    batteryState,
    isAvailable,
    errorMsg,
  };
};

export default useBattery;
