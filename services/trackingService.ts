/**
 * Tracking Service - Handle App Tracking Transparency and IDFA
 * Manages user tracking preferences and syncs to Supabase
 *
 * DEFENSIVE LOADING: This module safely handles environments where
 * expo-tracking-transparency is not available (Expo Go, Web, Android)
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type TrackingStatus = 'authorized' | 'denied' | 'restricted' | 'unavailable';

export interface TrackingResult {
  status: TrackingStatus;
  idfa: string | null;
  error?: string;
}

/**
 * Safely check if tracking transparency module is available
 * Returns null if module is not available (Expo Go, Web, etc.)
 */
const getTrackingModule = async (): Promise<any | null> => {
  try {
    // Only attempt to load on iOS
    if (Platform.OS !== 'ios') {
      return null;
    }

    // Dynamically import to avoid crashes in Expo Go
    const TrackingTransparency = await import('expo-tracking-transparency');
    return TrackingTransparency;
  } catch (error) {
    console.log('📊 Tracking module not available in this environment (Expo Go, dev build without module)');
    return null;
  }
};

/**
 * Request tracking permission and retrieve IDFA
 * Returns the tracking status and IDFA if authorized
 *
 * SAFE: Returns 'unavailable' if module not present
 */
export const requestTracking = async (): Promise<TrackingResult> => {
  try {
    // Only request on iOS 14+
    if (Platform.OS !== 'ios') {
      console.log('📊 Tracking: Not available on Android/Web');
      return {
        status: 'unavailable',
        idfa: null,
      };
    }

    // Safely get tracking module
    const TrackingTransparency = await getTrackingModule();

    if (!TrackingTransparency) {
      console.log('📊 Tracking module not available in this build');
      return {
        status: 'unavailable',
        idfa: null,
        error: 'Module not available in current environment',
      };
    }

    // Request tracking permission
    console.log('📊 Requesting App Tracking Transparency permission...');
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();

    console.log(`📊 Tracking permission status: ${status}`);

    // Get IDFA if authorized
    let idfa: string | null = null;
    if (status === 'granted') {
      try {
        const advertisingId = await TrackingTransparency.getAdvertisingId();
        idfa = advertisingId;
        console.log(`📊 IDFA retrieved: ${idfa ? `${idfa.substring(0, 8)}...` : 'null'}`);
      } catch (error) {
        console.error('📊 Error retrieving IDFA:', error);
      }
    }

    // Map Expo status to our TrackingStatus type
    // Expo returns: 'granted', 'denied', or 'undetermined'
    const trackingStatus: TrackingStatus =
      status === 'granted' ? 'authorized' :
      status === 'denied' ? 'denied' :
      'unavailable';

    return {
      status: trackingStatus,
      idfa,
    };
  } catch (error) {
    console.error('📊 Error requesting tracking permission:', error);
    return {
      status: 'unavailable',
      idfa: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check current tracking permission status without requesting
 *
 * SAFE: Returns 'unavailable' if module not present
 */
export const getTrackingStatus = async (): Promise<TrackingResult> => {
  try {
    if (Platform.OS !== 'ios') {
      return {
        status: 'unavailable',
        idfa: null,
      };
    }

    // Safely get tracking module
    const TrackingTransparency = await getTrackingModule();

    if (!TrackingTransparency) {
      console.log('📊 Tracking module not available in this build');
      return {
        status: 'unavailable',
        idfa: null,
      };
    }

    const { status } = await TrackingTransparency.getTrackingPermissionsAsync();

    let idfa: string | null = null;
    if (status === 'granted') {
      try {
        idfa = await TrackingTransparency.getAdvertisingId();
      } catch (error) {
        console.error('📊 Error retrieving IDFA:', error);
      }
    }

    const trackingStatus: TrackingStatus =
      status === 'granted' ? 'authorized' :
      status === 'denied' ? 'denied' :
      'unavailable';

    return {
      status: trackingStatus,
      idfa,
    };
  } catch (error) {
    console.error('📊 Error getting tracking status:', error);
    return {
      status: 'unavailable',
      idfa: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Check if tracking module is available in current environment
 * Useful for hiding tracking UI in Expo Go
 */
export const isTrackingAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const module = await getTrackingModule();
  return module !== null;
};

/**
 * Sync tracking status and IDFA to user profile in Supabase
 */
export const syncTrackingToProfile = async (result: TrackingResult): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn('📊 No authenticated user to sync tracking data');
      return false;
    }

    console.log(`📊 Syncing tracking data to profile for user ${user.id}`);

    // Update user metadata with tracking info
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        tracking_status: result.status,
        idfa: result.idfa,
        tracking_updated_at: new Date().toISOString(),
      },
    });

    if (updateError) {
      console.error('📊 Error updating user metadata:', updateError);
      return false;
    }

    console.log('✅ Tracking data synced to user profile');

    // Also update profiles table if it exists
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          tracking_status: result.status,
          idfa: result.idfa,
          tracking_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.warn('📊 Could not update profiles table:', profileError.message);
        // Don't return false - metadata update succeeded
      } else {
        console.log('✅ Tracking data synced to profiles table');
      }
    } catch (profileSyncError) {
      console.warn('📊 Profiles table may not exist:', profileSyncError);
      // Continue - not critical
    }

    return true;
  } catch (error) {
    console.error('📊 Error syncing tracking to profile:', error);
    return false;
  }
};

/**
 * Request tracking and sync to Supabase in one operation
 *
 * SAFE: Gracefully handles unavailable module
 */
export const requestAndSyncTracking = async (): Promise<TrackingResult> => {
  const result = await requestTracking();

  // Only sync if we got a meaningful result
  if (result.status !== 'unavailable') {
    // Sync to Supabase (but don't block on it)
    syncTrackingToProfile(result).catch(error => {
      console.error('📊 Background sync failed:', error);
    });
  }

  return result;
};
