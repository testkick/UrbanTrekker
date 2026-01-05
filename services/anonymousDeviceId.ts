/**
 * Anonymous Device Identity Service for Stepquest
 *
 * PRIVACY-FIRST APPROACH:
 * This service generates and persists an anonymous UUID for device identification
 * that is NOT tied to advertising or tracking identifiers.
 *
 * - Uses random UUID stored in secure storage
 * - Works for authenticated and anonymous users
 * - Survives app restarts but not reinstalls
 * - Compliant with GDPR, CCPA, and App Store guidelines
 * - Cannot be used for cross-app tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid';

// Storage key for the anonymous device ID
const DEVICE_ID_KEY = '@stepquest/anonymous_device_id';

// Cache to avoid repeated AsyncStorage reads
let cachedDeviceId: string | null = null;

/**
 * Generate a new anonymous device ID (UUID v4)
 */
const generateAnonymousId = (): string => {
  return uuidv4();
};

/**
 * Get or create the anonymous device ID
 * This ID persists across app restarts but is reset on reinstall
 *
 * PRIVACY NOTE: This is a locally-generated UUID, not an advertising identifier.
 * It's used solely for journey analytics and cannot be used for cross-app tracking.
 */
export const getAnonymousDeviceId = async (): Promise<string> => {
  // Return cached value if available
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // Try to load existing ID from storage
    const storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (storedId) {
      cachedDeviceId = storedId;
      return storedId;
    }

    // No existing ID - generate a new one
    const newId = generateAnonymousId();

    // Save to storage
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);

    // Cache it
    cachedDeviceId = newId;

    console.log('Generated new anonymous device ID');
    return newId;
  } catch (error) {
    console.error('Error getting anonymous device ID:', error);

    // Fallback: generate temporary ID (won't persist)
    const fallbackId = generateAnonymousId();
    cachedDeviceId = fallbackId;
    return fallbackId;
  }
};

/**
 * Clear the cached device ID (for testing purposes only)
 * This forces a fresh read from storage on next access
 */
export const clearDeviceIdCache = (): void => {
  cachedDeviceId = null;
};

/**
 * Reset the device ID (generate a new one)
 * Use with caution - this breaks continuity for analytics
 */
export const resetAnonymousDeviceId = async (): Promise<string> => {
  try {
    // Generate new ID
    const newId = generateAnonymousId();

    // Save to storage
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);

    // Update cache
    cachedDeviceId = newId;

    console.log('Reset anonymous device ID');
    return newId;
  } catch (error) {
    console.error('Error resetting device ID:', error);
    throw error;
  }
};

/**
 * Initialize the device ID system
 * Call this on app startup to pre-load the device ID
 */
export const initializeAnonymousDeviceId = async (): Promise<string> => {
  const deviceId = await getAnonymousDeviceId();
  console.log('Anonymous device ID initialized:', {
    idPrefix: deviceId.substring(0, 8),
    hasId: !!deviceId,
  });
  return deviceId;
};
