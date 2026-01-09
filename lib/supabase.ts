/**
 * Supabase Client Configuration
 * Handles authentication and database connections for Stepquest Explorer
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://cybdboebredjsfaobvzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YmRib2VicmVkanNmYW9idnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTM4MDcsImV4cCI6MjA4MTQyOTgwN30.FCK4d77mQGpNrAKPMHUAI8VWukRjEAwlXTdsGtqOILk';

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Silent fail
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Database types
export interface ProfileRow {
  id: string;
  total_steps: number;
  total_missions: number;
  total_distance_km: number;
  updated_at: string;
  device_id: string | null;
}

export interface RouteCoordinateRow {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface MissionRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  vibe: string;
  step_target: number;
  steps_completed: number;
  reward_text: string | null;
  completed_at: string;
  duration_minutes: number;
  created_at: string;
  route_coordinates: RouteCoordinateRow[] | null;
  device_id: string | null; // Anonymous device ID for journey analytics

  // High-Quality Discovery Engine fields
  // POI data from Google Places
  poi_name: string | null;
  poi_address: string | null;
  poi_rating: number | null;
  poi_review_count: number | null;
  poi_is_open_now: boolean | null;
  poi_place_id: string | null;
  poi_latitude: number | null;
  poi_longitude: number | null;

  // AI narrative data
  destination_type: string | null;
  destination_archetype: string | null;
  destination_narrative: string | null;

  // Completion metrics
  completion_type: 'steps' | 'proximity' | null;
  environment_type: string | null;
}
