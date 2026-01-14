-- Migration: Initialize database schema with IP tracking
-- Creates profiles and missions tables with all necessary fields including IP address
-- Date: 2026-01-14
-- Purpose: Add IP address tracking for security and regional analytics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_steps INTEGER NOT NULL DEFAULT 0,
  total_missions INTEGER NOT NULL DEFAULT 0,
  total_distance_km DECIMAL(10, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  device_id TEXT,
  last_scan_coords JSONB,
  last_scan_context TEXT,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  tracking_status TEXT,
  idfa TEXT,
  tracking_updated_at TIMESTAMP WITH TIME ZONE,
  last_ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create missions table (if not exists)
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  vibe TEXT NOT NULL CHECK (vibe IN ('chill', 'discovery', 'workout')),
  step_target INTEGER NOT NULL,
  steps_completed INTEGER NOT NULL,
  reward_text TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  route_coordinates JSONB DEFAULT '[]'::jsonb,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- POI data from Google Places
  poi_name TEXT,
  poi_address TEXT,
  poi_rating DECIMAL(2,1),
  poi_review_count INTEGER,
  poi_is_open_now BOOLEAN,
  poi_place_id TEXT,
  poi_latitude DOUBLE PRECISION,
  poi_longitude DOUBLE PRECISION,

  -- AI narrative data
  destination_type TEXT,
  destination_archetype TEXT,
  destination_narrative TEXT,

  -- Completion metrics
  completion_type TEXT CHECK (completion_type IN ('steps', 'proximity')),
  environment_type TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_ip_address ON profiles(last_ip_address);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);

CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_completed_at ON missions(completed_at);
CREATE INDEX IF NOT EXISTS idx_missions_device_id ON missions(device_id);
CREATE INDEX IF NOT EXISTS idx_missions_poi_name ON missions(poi_name);
CREATE INDEX IF NOT EXISTS idx_missions_destination_type ON missions(destination_type);
CREATE INDEX IF NOT EXISTS idx_missions_completion_type ON missions(completion_type);
CREATE INDEX IF NOT EXISTS idx_missions_environment_type ON missions(environment_type);

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with lifetime stats and device tracking';
COMMENT ON COLUMN profiles.last_ip_address IS 'User public IP address for security monitoring and regional analytics';
COMMENT ON COLUMN profiles.device_id IS 'Anonymous device UUID for journey analytics';
COMMENT ON COLUMN profiles.tracking_status IS 'App Tracking Transparency status (iOS)';
COMMENT ON COLUMN profiles.idfa IS 'Identifier for Advertisers (iOS, if tracking granted)';

COMMENT ON TABLE missions IS 'Completed missions with route data, POI information, and AI narratives';
COMMENT ON COLUMN missions.poi_name IS 'Real-world business or landmark name from Google Places';
COMMENT ON COLUMN missions.poi_address IS 'Physical address of the destination';
COMMENT ON COLUMN missions.poi_rating IS 'Google Places star rating (0.0-5.0)';
COMMENT ON COLUMN missions.poi_review_count IS 'Number of Google reviews';
COMMENT ON COLUMN missions.poi_is_open_now IS 'Whether the location was open when mission was created';
COMMENT ON COLUMN missions.poi_place_id IS 'Google Places unique identifier';
COMMENT ON COLUMN missions.poi_latitude IS 'Exact latitude of POI entrance';
COMMENT ON COLUMN missions.poi_longitude IS 'Exact longitude of POI entrance';
COMMENT ON COLUMN missions.destination_type IS 'Category of destination (bakery, cafe, park, landmark, etc.)';
COMMENT ON COLUMN missions.destination_archetype IS 'AI-generated poetic name for the destination';
COMMENT ON COLUMN missions.destination_narrative IS 'AI-generated "Why Visit" narrative hook';
COMMENT ON COLUMN missions.completion_type IS 'How the mission was completed: steps (reached step goal) or proximity (arrived at destination)';
COMMENT ON COLUMN missions.environment_type IS 'Environment type where mission took place (urban, park, coastal, etc.)';

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for missions
CREATE POLICY "Users can view own missions" ON missions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions" ON missions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions" ON missions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own missions" ON missions
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, total_steps, total_missions, total_distance_km)
  VALUES (new.id, 0, 0, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
