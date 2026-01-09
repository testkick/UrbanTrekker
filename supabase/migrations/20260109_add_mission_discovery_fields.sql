-- Migration: Add High-Quality Discovery Engine fields to missions table
-- This migration adds fields to store POI data, AI narratives, and completion metrics

-- Add all new fields in a single ALTER TABLE statement
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS poi_name TEXT,
ADD COLUMN IF NOT EXISTS poi_address TEXT,
ADD COLUMN IF NOT EXISTS poi_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS poi_review_count INTEGER,
ADD COLUMN IF NOT EXISTS poi_is_open_now BOOLEAN,
ADD COLUMN IF NOT EXISTS poi_place_id TEXT,
ADD COLUMN IF NOT EXISTS poi_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS poi_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS destination_type TEXT,
ADD COLUMN IF NOT EXISTS destination_archetype TEXT,
ADD COLUMN IF NOT EXISTS destination_narrative TEXT,
ADD COLUMN IF NOT EXISTS completion_type TEXT CHECK (completion_type IN ('steps', 'proximity')),
ADD COLUMN IF NOT EXISTS environment_type TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_missions_poi_name ON missions(poi_name);
CREATE INDEX IF NOT EXISTS idx_missions_destination_type ON missions(destination_type);
CREATE INDEX IF NOT EXISTS idx_missions_completion_type ON missions(completion_type);
CREATE INDEX IF NOT EXISTS idx_missions_environment_type ON missions(environment_type);

-- Add comments for documentation
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
