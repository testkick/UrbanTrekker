/**
 * Storage Service for Stepquest
 * Cloud-aware data management using Supabase (when logged in) or AsyncStorage (offline)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MissionVibe, RouteCoordinate } from '@/types/mission';
import { supabase, ProfileRow, MissionRow } from '@/lib/supabase';

// Storage Keys
const STORAGE_KEYS = {
  USER_STATS: '@stepquest/user_stats',
  MISSION_HISTORY: '@stepquest/mission_history',
} as const;

// Types
export interface UserStats {
  totalSteps: number;
  totalMissions: number;
  totalDistanceKm: number;
  lastUpdated: string;
}

export interface CompletedMission {
  id: string;
  title: string;
  description: string;
  vibe: MissionVibe;
  stepTarget: number;
  stepsCompleted: number;
  rewardText: string;
  completedAt: string;
  durationMinutes: number;
  /** GPS route coordinates recorded during the mission */
  routeCoordinates?: RouteCoordinate[];
}

// Default values
const DEFAULT_STATS: UserStats = {
  totalSteps: 0,
  totalMissions: 0,
  totalDistanceKm: 0,
  lastUpdated: new Date().toISOString(),
};

// Average step length in km
const STEP_LENGTH_KM = 0.000762;

/**
 * Helper to check if user is authenticated
 */
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
};

/**
 * Convert Supabase profile row to UserStats
 */
const profileToStats = (profile: ProfileRow): UserStats => ({
  totalSteps: profile.total_steps,
  totalMissions: profile.total_missions,
  totalDistanceKm: profile.total_distance_km,
  lastUpdated: profile.updated_at,
});

/**
 * Convert Supabase mission row to CompletedMission
 */
const missionRowToCompleted = (row: MissionRow): CompletedMission => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  vibe: row.vibe as MissionVibe,
  stepTarget: row.step_target,
  stepsCompleted: row.steps_completed,
  rewardText: row.reward_text || '',
  completedAt: row.completed_at,
  durationMinutes: row.duration_minutes,
  routeCoordinates: row.route_coordinates || undefined,
});

// ============================================
// LOCAL STORAGE FUNCTIONS (AsyncStorage)
// ============================================

/**
 * Get user stats from local storage
 */
const getLocalUserStats = async (): Promise<UserStats> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_STATS);
    if (data) {
      return JSON.parse(data) as UserStats;
    }
    return DEFAULT_STATS;
  } catch (error) {
    console.error('Error loading local user stats:', error);
    return DEFAULT_STATS;
  }
};

/**
 * Save user stats to local storage
 */
const saveLocalUserStats = async (stats: UserStats): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving local user stats:', error);
  }
};

/**
 * Get mission history from local storage
 */
const getLocalMissionHistory = async (): Promise<CompletedMission[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MISSION_HISTORY);
    if (data) {
      return JSON.parse(data) as CompletedMission[];
    }
    return [];
  } catch (error) {
    console.error('Error loading local mission history:', error);
    return [];
  }
};

/**
 * Save mission to local storage
 */
const saveLocalMission = async (mission: CompletedMission): Promise<void> => {
  try {
    const history = await getLocalMissionHistory();
    const updatedHistory = [mission, ...history];
    await AsyncStorage.setItem(
      STORAGE_KEYS.MISSION_HISTORY,
      JSON.stringify(updatedHistory)
    );
  } catch (error) {
    console.error('Error saving local mission:', error);
    throw error;
  }
};

// ============================================
// CLOUD STORAGE FUNCTIONS (Supabase)
// ============================================

/**
 * Get user stats from Supabase
 */
const getCloudUserStats = async (userId: string): Promise<UserStats> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching cloud stats:', error);
      return DEFAULT_STATS;
    }

    return profileToStats(data as ProfileRow);
  } catch (error) {
    console.error('Error fetching cloud stats:', error);
    return DEFAULT_STATS;
  }
};

/**
 * Save user stats to Supabase
 */
const saveCloudUserStats = async (userId: string, stats: UserStats): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        total_steps: stats.totalSteps,
        total_missions: stats.totalMissions,
        total_distance_km: stats.totalDistanceKm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error saving cloud stats:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error saving cloud stats:', error);
    throw error;
  }
};

/**
 * Get mission history from Supabase
 */
const getCloudMissionHistory = async (userId: string): Promise<CompletedMission[]> => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching cloud missions:', error);
      return [];
    }

    return (data as MissionRow[]).map(missionRowToCompleted);
  } catch (error) {
    console.error('Error fetching cloud missions:', error);
    return [];
  }
};

/**
 * Save mission to Supabase
 */
const saveCloudMission = async (userId: string, mission: CompletedMission): Promise<void> => {
  try {
    const { error } = await supabase
      .from('missions')
      .insert({
        id: mission.id,
        user_id: userId,
        title: mission.title,
        description: mission.description,
        vibe: mission.vibe,
        step_target: mission.stepTarget,
        steps_completed: mission.stepsCompleted,
        reward_text: mission.rewardText,
        completed_at: mission.completedAt,
        duration_minutes: mission.durationMinutes,
        route_coordinates: mission.routeCoordinates || [],
      });

    if (error) {
      console.error('Error saving cloud mission:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error saving cloud mission:', error);
    throw error;
  }
};

/**
 * Delete all missions from Supabase for a user
 */
const clearCloudMissions = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing cloud missions:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error clearing cloud missions:', error);
    throw error;
  }
};

/**
 * Reset cloud stats to default
 */
const resetCloudStats = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        total_steps: 0,
        total_missions: 0,
        total_distance_km: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error resetting cloud stats:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error resetting cloud stats:', error);
    throw error;
  }
};

// ============================================
// PUBLIC API (Cloud-aware functions)
// ============================================

/**
 * Get user stats (cloud if logged in, local otherwise)
 */
export const getUserStats = async (): Promise<UserStats> => {
  const userId = await getCurrentUserId();

  if (userId) {
    return getCloudUserStats(userId);
  }

  return getLocalUserStats();
};

/**
 * Save user stats (cloud if logged in, local otherwise)
 */
export const saveUserStats = async (stats: UserStats): Promise<void> => {
  const userId = await getCurrentUserId();

  if (userId) {
    await saveCloudUserStats(userId, stats);
  } else {
    await saveLocalUserStats(stats);
  }
};

/**
 * Update user stats after completing a mission
 */
export const updateStatsAfterMission = async (
  stepsCompleted: number
): Promise<UserStats> => {
  try {
    const currentStats = await getUserStats();
    const distanceKm = stepsCompleted * STEP_LENGTH_KM;

    const updatedStats: UserStats = {
      totalSteps: currentStats.totalSteps + stepsCompleted,
      totalMissions: currentStats.totalMissions + 1,
      totalDistanceKm: currentStats.totalDistanceKm + distanceKm,
      lastUpdated: new Date().toISOString(),
    };

    await saveUserStats(updatedStats);
    return updatedStats;
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
};

/**
 * Get mission history (cloud if logged in, local otherwise)
 */
export const getMissionHistory = async (): Promise<CompletedMission[]> => {
  const userId = await getCurrentUserId();

  if (userId) {
    return getCloudMissionHistory(userId);
  }

  return getLocalMissionHistory();
};

/**
 * Save a completed mission to history
 */
export const saveCompletedMission = async (
  mission: CompletedMission
): Promise<void> => {
  const userId = await getCurrentUserId();

  if (userId) {
    await saveCloudMission(userId, mission);
  } else {
    await saveLocalMission(mission);
  }
};

/**
 * Clear all data (for testing/reset)
 */
export const clearAllData = async (): Promise<void> => {
  const userId = await getCurrentUserId();

  if (userId) {
    // Clear cloud data
    await Promise.all([
      clearCloudMissions(userId),
      resetCloudStats(userId),
    ]);
  }

  // Always clear local data
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.USER_STATS,
    STORAGE_KEYS.MISSION_HISTORY,
  ]);
};

/**
 * Get combined data for the journal
 */
export const getJournalData = async (): Promise<{
  stats: UserStats;
  history: CompletedMission[];
}> => {
  const [stats, history] = await Promise.all([
    getUserStats(),
    getMissionHistory(),
  ]);
  return { stats, history };
};

/**
 * Sync local data to cloud after login
 * This is called when a user successfully signs in or signs up
 */
export const syncLocalDataToCloud = async (userId: string): Promise<void> => {
  try {
    // Get local data
    const localStats = await getLocalUserStats();
    const localHistory = await getLocalMissionHistory();

    // Check if there's any local data to sync
    const hasLocalData =
      localStats.totalSteps > 0 ||
      localStats.totalMissions > 0 ||
      localHistory.length > 0;

    if (!hasLocalData) {
      console.log('No local data to sync');
      return;
    }

    console.log('Syncing local data to cloud...', {
      stats: localStats,
      missionsCount: localHistory.length,
    });

    // Get current cloud stats
    const cloudStats = await getCloudUserStats(userId);

    // Merge stats (add local to cloud)
    const mergedStats: UserStats = {
      totalSteps: cloudStats.totalSteps + localStats.totalSteps,
      totalMissions: cloudStats.totalMissions + localStats.totalMissions,
      totalDistanceKm: cloudStats.totalDistanceKm + localStats.totalDistanceKm,
      lastUpdated: new Date().toISOString(),
    };

    // Save merged stats to cloud
    await saveCloudUserStats(userId, mergedStats);

    // Upload local missions to cloud (if any)
    for (const mission of localHistory) {
      try {
        await saveCloudMission(userId, mission);
      } catch (error) {
        // If mission already exists (duplicate ID), skip it
        console.log('Mission may already exist, skipping:', mission.id);
      }
    }

    // Clear local data after successful sync
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_STATS,
      STORAGE_KEYS.MISSION_HISTORY,
    ]);

    console.log('Local data synced and cleared successfully');
  } catch (error) {
    console.error('Error syncing local data to cloud:', error);
    throw error;
  }
};

/**
 * Check if there's local data that needs syncing
 */
export const hasLocalDataToSync = async (): Promise<boolean> => {
  const localStats = await getLocalUserStats();
  const localHistory = await getLocalMissionHistory();

  return (
    localStats.totalSteps > 0 ||
    localStats.totalMissions > 0 ||
    localHistory.length > 0
  );
};

/**
 * Update the device ID for a user's profile
 * Called when user signs in or app initializes
 */
export const updateUserDeviceId = async (userId: string, deviceId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ device_id: deviceId })
      .eq('id', userId);

    if (error) {
      console.error('Error updating device ID:', error);
      throw error;
    }

    console.log('Device ID updated successfully');
  } catch (error) {
    console.error('Error updating device ID:', error);
    throw error;
  }
};

/**
 * Get the device ID for a user
 */
export const getUserDeviceId = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('device_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching device ID:', error);
      return null;
    }

    return data?.device_id || null;
  } catch (error) {
    console.error('Error fetching device ID:', error);
    return null;
  }
};

// ============================================
// SCAN LOCATION LOGGING
// ============================================

/**
 * Scan location coordinates type
 */
export interface ScanLocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Save scan location to user's profile
 * Called when "Scan Area" is clicked to log the user's location
 * This is a fire-and-forget operation - errors are logged but not thrown
 */
export const saveScanLocation = async (
  coords: ScanLocationCoords,
  context: string
): Promise<void> => {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      // User not logged in - skip saving to cloud
      console.log('Scan location not saved: user not logged in');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        last_scan_coords: coords,
        last_scan_context: context,
        last_scan_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error saving scan location:', error);
      return;
    }

    console.log('Scan location saved:', { coords, context });
  } catch (error) {
    console.error('Error saving scan location:', error);
    // Don't throw - this is a fire-and-forget operation
  }
};
