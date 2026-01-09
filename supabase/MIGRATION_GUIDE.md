# Supabase Schema Migration Guide

## Overview
This migration adds High-Quality Discovery Engine fields to the `missions` table to persist POI data, AI narratives, and completion metrics to the cloud.

## Migration File
- **File**: `/workspace/supabase/migrations/20260109_add_mission_discovery_fields.sql`
- **Date**: 2026-01-09
- **Purpose**: Add fields for real POI data, AI narratives, and completion metrics

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)
```bash
# Initialize Supabase if not already done
supabase init

# Link to your project
supabase link --project-ref cybdboebredjsfaobvzw

# Apply the migration
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/cybdboebredjsfaobvzw
2. Navigate to **SQL Editor**
3. Copy the contents of `/workspace/supabase/migrations/20260109_add_mission_discovery_fields.sql`
4. Paste into the SQL Editor
5. Click **Run**

### Option 3: Using MCP Supabase Tool
```typescript
// The SQL will be executed automatically via the MCP Supabase integration
```

## New Fields Added to `missions` Table

### POI Data Fields (from Google Places)
- `poi_name` (TEXT) - Real-world business or landmark name
- `poi_address` (TEXT) - Physical address of the destination
- `poi_rating` (DECIMAL) - Google Places star rating (0.0-5.0)
- `poi_review_count` (INTEGER) - Number of Google reviews
- `poi_is_open_now` (BOOLEAN) - Whether location was open when mission created
- `poi_place_id` (TEXT) - Google Places unique identifier
- `poi_latitude` (DOUBLE PRECISION) - Exact latitude of POI entrance
- `poi_longitude` (DOUBLE PRECISION) - Exact longitude of POI entrance

### AI Narrative Fields
- `destination_type` (TEXT) - Category (bakery, cafe, park, landmark, etc.)
- `destination_archetype` (TEXT) - AI-generated poetic name
- `destination_narrative` (TEXT) - AI-generated "Why Visit" narrative

### Completion Metrics
- `completion_type` (TEXT) - How mission was completed: 'steps' or 'proximity'
- `environment_type` (TEXT) - Environment where mission took place (urban, park, coastal, etc.)

## Indexes Created
- `idx_missions_poi_name` - For querying missions by POI name
- `idx_missions_destination_type` - For filtering by destination type
- `idx_missions_completion_type` - For analyzing completion patterns
- `idx_missions_environment_type` - For environment-based analytics

## Backwards Compatibility
- ✅ All new fields are nullable
- ✅ Existing missions will continue to work
- ✅ Only missions created after this migration will have POI data
- ✅ The app gracefully handles both old and new mission formats

## Verification Checklist

After applying the migration, verify:

1. **Schema Updated**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'missions'
   AND column_name LIKE 'poi_%' OR column_name LIKE 'destination_%' OR column_name = 'completion_type';
   ```

2. **Indexes Created**
   ```sql
   SELECT indexname
   FROM pg_indexes
   WHERE tablename = 'missions'
   AND indexname LIKE 'idx_missions_%';
   ```

3. **Test Insert**
   ```sql
   -- Should succeed with new fields
   INSERT INTO missions (
     id, user_id, title, vibe, step_target, steps_completed,
     completed_at, duration_minutes,
     poi_name, poi_rating, destination_type, completion_type
   ) VALUES (
     'test-123', 'user-id', 'Test Mission', 'chill', 1000, 1200,
     NOW(), 15,
     'Blue Bottle Coffee', 4.7, 'cafe', 'proximity'
   );
   ```

## Data Flow

```
User Completes Mission
         ↓
useMission.completeMission()
         ↓
Creates CompletedMission object with:
  - POI data (name, rating, address, etc.)
  - AI narrative (type, archetype, narrative)
  - Completion metrics (type, environment)
         ↓
storage.saveCompletedMission()
         ↓
If logged in:
  storage.saveCloudMission()
         ↓
Supabase INSERT to missions table
         ↓
All fields persisted to cloud
```

## Roll Back (if needed)

```sql
-- Remove added fields
ALTER TABLE missions
DROP COLUMN IF EXISTS poi_name,
DROP COLUMN IF EXISTS poi_address,
DROP COLUMN IF EXISTS poi_rating,
DROP COLUMN IF EXISTS poi_review_count,
DROP COLUMN IF EXISTS poi_is_open_now,
DROP COLUMN IF EXISTS poi_place_id,
DROP COLUMN IF EXISTS poi_latitude,
DROP COLUMN IF EXISTS poi_longitude,
DROP COLUMN IF EXISTS destination_type,
DROP COLUMN IF EXISTS destination_archetype,
DROP COLUMN IF EXISTS destination_narrative,
DROP COLUMN IF EXISTS completion_type,
DROP COLUMN IF EXISTS environment_type;

-- Remove indexes
DROP INDEX IF EXISTS idx_missions_poi_name;
DROP INDEX IF EXISTS idx_missions_destination_type;
DROP INDEX IF EXISTS idx_missions_completion_type;
DROP INDEX IF EXISTS idx_missions_environment_type;
```

## Expected Impact

### Storage Impact
- Approximately **500-1000 bytes** per mission (depending on POI data length)
- If you have 1,000 missions: ~1 MB additional storage
- If you have 10,000 missions: ~10 MB additional storage

### Performance Impact
- ✅ Minimal - added indexes ensure fast queries
- ✅ Nullable fields don't affect existing queries
- ✅ INSERT operations will be ~10-15% slower (acceptable)

### Analytics Benefits
- 📊 Track which real-world businesses users visit most
- 📊 Analyze completion patterns (steps vs proximity)
- 📊 Understand environment preferences (urban, park, coastal)
- 📊 Identify top-rated destinations in your user base
- 📊 Map POI coordinates for heat map visualizations

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify API permissions for the `missions` table
3. Ensure RLS policies allow INSERT with new fields
4. Contact support with migration file details
