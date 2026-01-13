/**
 * Tracking Hook - Manage App Tracking Transparency state
 * Provides easy access to tracking status throughout the app
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  getTrackingStatus,
  syncTrackingToProfile,
  type TrackingResult,
  type TrackingStatus,
} from '@/services/trackingService';

export interface UseTrackingResult {
  status: TrackingStatus;
  idfa: string | null;
  isChecking: boolean;
  isAuthorized: boolean;
  error?: string;
  recheckTracking: () => Promise<void>;
}

/**
 * Hook to check and monitor App Tracking Transparency status
 * Automatically syncs changes to Supabase profile
 */
export const useTracking = (): UseTrackingResult => {
  const [trackingState, setTrackingState] = useState<TrackingResult>({
    status: 'unavailable',
    idfa: null,
  });
  const [isChecking, setIsChecking] = useState(true);

  const checkTracking = async () => {
    try {
      setIsChecking(true);

      // Only check on iOS
      if (Platform.OS !== 'ios') {
        setTrackingState({
          status: 'unavailable',
          idfa: null,
        });
        setIsChecking(false);
        return;
      }

      const result = await getTrackingStatus();
      setTrackingState(result);

      // Sync to profile if authorized
      if (result.status === 'authorized' && result.idfa) {
        await syncTrackingToProfile(result);
      }

      console.log('📊 Tracking status checked:', result.status);
    } catch (error) {
      console.error('Error checking tracking status:', error);
      setTrackingState({
        status: 'unavailable',
        idfa: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkTracking();
  }, []);

  return {
    status: trackingState.status,
    idfa: trackingState.idfa,
    isChecking,
    isAuthorized: trackingState.status === 'authorized',
    error: trackingState.error,
    recheckTracking: checkTracking,
  };
};

export default useTracking;
