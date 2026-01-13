/**
 * Permission Management Hook
 * Checks and manages location and motion permissions
 */

import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface PermissionStatus {
  location: boolean;
  background: boolean;
  allGranted: boolean;
  isChecking: boolean;
}

export const usePermissions = () => {
  const [status, setStatus] = useState<PermissionStatus>({
    location: false,
    background: false,
    allGranted: false,
    isChecking: true,
  });

  const checkPermissions = async () => {
    try {
      setStatus(prev => ({ ...prev, isChecking: true }));

      // Check foreground location permission
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const locationGranted = foregroundStatus.status === 'granted';

      // Check background location permission (iOS only) - OPTIONAL
      let backgroundGranted = false;
      if (Platform.OS === 'ios') {
        const backgroundStatus = await Location.getBackgroundPermissionsAsync();
        backgroundGranted = backgroundStatus.status === 'granted';
      } else {
        // Android doesn't have separate background permission in this context
        backgroundGranted = locationGranted;
      }

      // Only require foreground location - background is optional
      const allGranted = locationGranted;

      setStatus({
        location: locationGranted,
        background: backgroundGranted,
        allGranted,
        isChecking: false,
      });

      console.log('📍 Permission Status:', {
        location: locationGranted,
        background: backgroundGranted ? '✅ granted' : '⚠️ not granted (optional)',
        allGranted,
      });

      return allGranted;
    } catch (error) {
      console.error('Error checking permissions:', error);
      setStatus({
        location: false,
        background: false,
        allGranted: false,
        isChecking: false,
      });
      return false;
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    ...status,
    recheckPermissions: checkPermissions,
  };
};
