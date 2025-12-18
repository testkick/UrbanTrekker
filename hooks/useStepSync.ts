/**
 * useStepSync Hook
 * Continuously syncs step counts to lifetime stats storage
 * Works with both cloud (Supabase) and local (AsyncStorage) storage
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  incrementLifetimeStats,
  getLastSyncedSteps,
  saveLastSyncedSteps,
} from '@/services/storage';

// Sync interval in milliseconds (30 seconds)
const SYNC_INTERVAL_MS = 30000;

// Minimum steps delta to trigger a sync (avoid excessive writes)
const MIN_STEPS_DELTA = 5;

interface UseStepSyncOptions {
  /** Current step count from pedometer (today's steps) */
  currentSteps: number;
  /** Whether the pedometer is available */
  isAvailable?: boolean;
}

/**
 * Hook to sync step counts to lifetime stats periodically
 * @param options - Configuration options
 */
export const useStepSync = (options: UseStepSyncOptions): void => {
  const { currentSteps, isAvailable = true } = options;

  // Track the cumulative total steps synced during this session
  const cumulativeSyncedRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const isSyncingRef = useRef<boolean>(false);

  // Initialize cumulative synced steps on mount
  useEffect(() => {
    const initializeSyncedSteps = async () => {
      try {
        const lastSynced = await getLastSyncedSteps();
        cumulativeSyncedRef.current = lastSynced;
        console.log('Step sync initialized with cumulative:', lastSynced);
      } catch (error) {
        console.error('Error initializing step sync:', error);
        cumulativeSyncedRef.current = 0;
      }
    };

    initializeSyncedSteps();
  }, []);

  // Sync function
  const syncSteps = useCallback(async (forceSync: boolean = false) => {
    if (!isAvailable) return;
    if (isSyncingRef.current) return;

    // Calculate delta since last sync
    // We track cumulative steps across days, so we compare currentSteps
    // (today's steps since midnight) with what we've synced from today
    const delta = currentSteps - (cumulativeSyncedRef.current % 100000);

    // Only sync if we have a meaningful delta or forcing
    if (delta < MIN_STEPS_DELTA && !forceSync) return;

    // Avoid syncing negative deltas (can happen on midnight reset)
    if (delta <= 0) {
      // Update cumulative to current if delta is negative (day reset)
      cumulativeSyncedRef.current = currentSteps;
      await saveLastSyncedSteps(currentSteps);
      return;
    }

    isSyncingRef.current = true;

    try {
      await incrementLifetimeStats(delta);

      // Update cumulative tracker
      cumulativeSyncedRef.current += delta;
      await saveLastSyncedSteps(currentSteps);

      lastSyncTimeRef.current = Date.now();
      console.log(`Step sync completed: +${delta} steps (total synced today: ${currentSteps})`);
    } catch (error) {
      console.error('Error syncing steps:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [currentSteps, isAvailable]);

  // Periodic sync interval
  useEffect(() => {
    if (!isAvailable) return;

    const intervalId = setInterval(() => {
      syncSteps(false);
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [syncSteps, isAvailable]);

  // Sync on app state change (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Sync when app goes to background
        syncSteps(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [syncSteps]);

  // Sync when steps change significantly
  useEffect(() => {
    // Calculate delta and check if it's significant enough
    const sessionSyncedSteps = cumulativeSyncedRef.current % 100000;
    const delta = currentSteps - sessionSyncedSteps;

    // Sync if delta exceeds threshold (every ~50 steps for more frequent updates)
    if (delta >= 50) {
      syncSteps(false);
    }
  }, [currentSteps, syncSteps]);
};

export default useStepSync;
