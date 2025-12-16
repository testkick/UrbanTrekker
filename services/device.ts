/**
 * Device Identity Service for Stepquest
 * Handles device identification and App Tracking Transparency permission
 * Uses lazy loading to gracefully handle missing native modules in Expo Go
 */

import { Platform } from 'react-native';

// Type definitions for the modules (type-only imports)
type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export interface DeviceInfo {
  deviceId: string;
  trackingStatus: PermissionStatus | null;
  platform: 'ios' | 'android' | 'web';
}

// Cache for lazy-loaded modules
let trackingTransparencyModule: {
  requestTrackingPermissionsAsync: () => Promise<{ status: PermissionStatus }>;
  getTrackingPermissionsAsync: () => Promise<{ status: PermissionStatus }>;
} | null = null;

let applicationModule: {
  getIosIdForVendorAsync: () => Promise<string | null>;
  getAndroidId: () => string | null;
} | null = null;

let modulesLoaded = false;

/**
 * Safely load the native modules
 * Returns false if modules are unavailable (e.g., in Expo Go)
 */
const loadModules = (): boolean => {
  if (modulesLoaded) {
    return trackingTransparencyModule !== null || applicationModule !== null;
  }

  modulesLoaded = true;

  // Try to load expo-tracking-transparency
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    trackingTransparencyModule = require('expo-tracking-transparency');
  } catch (error) {
    console.warn('expo-tracking-transparency not available:', error);
    trackingTransparencyModule = null;
  }

  // Try to load expo-application
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    applicationModule = require('expo-application');
  } catch (error) {
    console.warn('expo-application not available:', error);
    applicationModule = null;
  }

  return trackingTransparencyModule !== null || applicationModule !== null;
};

/**
 * Request App Tracking Transparency permission (iOS only)
 * This is required on iOS to access the IDFA (Advertising Identifier)
 */
export const requestTrackingPermission = async (): Promise<PermissionStatus | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  loadModules();

  if (!trackingTransparencyModule) {
    console.log('Tracking transparency module not available, skipping permission request');
    return null;
  }

  try {
    const { status } = await trackingTransparencyModule.requestTrackingPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Error requesting tracking permission:', error);
    return null;
  }
};

/**
 * Get the current tracking permission status (iOS only)
 */
export const getTrackingStatus = async (): Promise<PermissionStatus | null> => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  loadModules();

  if (!trackingTransparencyModule) {
    console.log('Tracking transparency module not available');
    return null;
  }

  try {
    const { status } = await trackingTransparencyModule.getTrackingPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Error getting tracking status:', error);
    return null;
  }
};

/**
 * Get the unique device identifier
 * - iOS: Uses IDFV (Identifier for Vendor) - available without permission
 * - Android: Uses Android ID
 * - Web: Returns null
 */
export const getDeviceId = async (): Promise<string | null> => {
  loadModules();

  if (!applicationModule) {
    console.log('Application module not available, cannot get device ID');
    return null;
  }

  try {
    if (Platform.OS === 'ios') {
      // IDFV is always available and doesn't require tracking permission
      // It's unique per vendor (app developer) per device
      const idfv = await applicationModule.getIosIdForVendorAsync();
      return idfv;
    } else if (Platform.OS === 'android') {
      // Android ID is available without special permissions
      const androidId = applicationModule.getAndroidId();
      return androidId;
    } else {
      // Web platform - return null
      return null;
    }
  } catch (error) {
    console.error('Error getting device ID:', error);
    return null;
  }
};

/**
 * Get the Advertising ID (IDFA on iOS, AAID on Android)
 * Requires tracking permission on iOS
 */
export const getAdvertisingId = async (): Promise<string | null> => {
  loadModules();

  if (!applicationModule) {
    console.log('Application module not available');
    return null;
  }

  try {
    if (Platform.OS === 'ios') {
      // Check if tracking is allowed first
      const status = await getTrackingStatus();
      if (status !== 'granted') {
        console.log('Tracking not granted, cannot get IDFA');
        return null;
      }

      // IDFA would require native code, so we fall back to IDFV
      // In a production app with native modules, you'd use react-native-idfa
      return await applicationModule.getIosIdForVendorAsync();
    } else if (Platform.OS === 'android') {
      // For Android, we'd need Google Play Services for AAID
      // Fall back to Android ID
      return applicationModule.getAndroidId();
    }

    return null;
  } catch (error) {
    console.error('Error getting advertising ID:', error);
    return null;
  }
};

/**
 * Get complete device information
 * Requests tracking permission on iOS and retrieves device ID
 */
export const getDeviceInfo = async (requestPermission: boolean = false): Promise<DeviceInfo> => {
  let trackingStatus: PermissionStatus | null = null;

  // Request or check tracking permission on iOS
  if (Platform.OS === 'ios') {
    if (requestPermission) {
      trackingStatus = await requestTrackingPermission();
    } else {
      trackingStatus = await getTrackingStatus();
    }
  }

  // Get device ID
  const deviceId = await getDeviceId();

  return {
    deviceId: deviceId || 'unknown',
    trackingStatus,
    platform: Platform.OS as 'ios' | 'android' | 'web',
  };
};

/**
 * Initialize device tracking
 * Call this when the app starts or when user signs in
 */
export const initializeDeviceTracking = async (): Promise<DeviceInfo> => {
  // Request tracking permission on iOS (required for ATT compliance)
  const deviceInfo = await getDeviceInfo(true);

  console.log('Device info initialized:', {
    platform: deviceInfo.platform,
    hasDeviceId: deviceInfo.deviceId !== 'unknown',
    trackingStatus: deviceInfo.trackingStatus,
  });

  return deviceInfo;
};
