# Precise Timestamp Tracking Implementation Guide

## Overview
This guide documents the implementation of precise timestamp tracking for all missions in the Urban Explorer Journal. Every mission now captures exact start and end times for chronological accuracy and professional display.

## Database Changes

### Migration: `add_started_at_to_missions.sql`
- **Date**: 2026-01-14
- **Purpose**: Add precise start timestamp tracking to missions

#### Changes Made:
1. Added `started_at TIMESTAMP WITH TIME ZONE` column to `missions` table
2. Created index `idx_missions_started_at` for performance
3. Added column documentation comment

#### SQL Applied:
```sql
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_missions_started_at ON missions(started_at);

COMMENT ON COLUMN missions.started_at IS 'Timestamp when the user accepted/started the mission';
```

## Code Changes

### 1. Type Definitions

#### `services/storage.ts` - CompletedMission Interface
```typescript
export interface CompletedMission {
  // ... existing fields ...
  startedAt: string; // ISO 8601 timestamp when mission was accepted
  completedAt: string; // ISO 8601 timestamp when mission was completed
  durationMinutes: number;
  // ... rest of fields ...
}
```

#### `lib/supabase.ts` - MissionRow Interface
```typescript
export interface MissionRow {
  // ... existing fields ...
  started_at: string | null; // When mission was accepted
  completed_at: string; // When mission was completed
  // ... rest of fields ...
}
```

### 2. Data Capture

#### `hooks/useMission.ts` - Mission Completion
When a mission is completed, both timestamps are captured:
```typescript
const completedMission: CompletedMission = {
  // ... other fields ...
  startedAt: new Date(activeMission.startedAt).toISOString(), // Precise start
  completedAt: new Date().toISOString(), // Precise completion
  durationMinutes,
  // ... rest of fields ...
};
```

#### `services/storage.ts` - Cloud Storage
Both timestamps are saved to Supabase:
```typescript
await supabase.from('missions').insert({
  // ... other fields ...
  started_at: mission.startedAt, // When mission was accepted
  completed_at: mission.completedAt, // When mission was completed
  // ... rest of fields ...
});
```

### 3. Professional Formatting Utilities

#### `utils/timeFormat.ts`
New utility file with professional timestamp formatting:

- **`formatMissionTimestamp(timestamp)`**: Full format
  - Example: "Monday, Oct 24 • 4:15 PM"

- **`formatTimeRange(startTime, endTime)`**: Time range display
  - Example: "4:15 PM → 4:29 PM"

- **`formatDuration(durationMinutes)`**: Human-friendly duration
  - Example: "14 min walk" or "1 hr 24 min walk"

- **`formatRelativeDate(timestamp)`**: Contextual date
  - Example: "Today", "Yesterday", or "Monday, Oct 24"

- **`formatJournalTimestamp(startTime, endTime?)`**: Complete journal format
  - Example: "Today • 4:15 PM → 4:29 PM"

### 4. Journal UI Updates

#### `app/journal.tsx` - Mission Cards
Each mission card now displays:

1. **Relative Date**: "Today", "Yesterday", or full date
2. **Time Range**: Start time → End time with arrow separator
3. **Duration**: Professional format like "14 min walk"

Example display:
```
Quest Title
Today • 4:15 PM → 4:29 PM
14 min walk
```

## Legacy Data Handling

### Backward Compatibility
For missions created before this update:
- `startedAt` falls back to `created_at` timestamp if not available
- All new missions will have precise `started_at` and `completed_at`
- Duration calculations remain accurate

### Guest-to-Cloud Legacy Sync
The sync process correctly migrates both timestamps:
- Local missions preserve their start and end times
- Batch upload includes `started_at` field
- Historical accuracy maintained during migration

## Testing Verification

### Database Schema
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'missions'
AND column_name IN ('started_at', 'completed_at', 'duration_minutes');
```

### Index Verification
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'missions'
AND indexname = 'idx_missions_started_at';
```

### Sample Data Query
```sql
SELECT
  title,
  started_at,
  completed_at,
  duration_minutes,
  EXTRACT(EPOCH FROM (completed_at - started_at))/60 AS calculated_duration
FROM missions
WHERE user_id = 'your-user-id'
ORDER BY completed_at DESC
LIMIT 5;
```

## User Experience

### Professional Display Format
- **Clean Typography**: Professional, easy-to-read timestamp formats
- **Contextual Dates**: "Today" and "Yesterday" for recent missions
- **Time Range**: Clear start → end time with arrow separator
- **Duration**: Human-friendly format ("14 min walk")
- **Subtle Iconography**: Time icon for duration, clock icon for timestamps

### Urban Explorer Aesthetic
- Consistent with the app's professional design
- Muted colors for secondary information
- Clear visual hierarchy
- No cluttered or technical timestamps

## Analytics Benefits

With precise timestamps, you can now analyze:
1. **Time of Day Patterns**: When users prefer to walk
2. **Duration Distribution**: Average walk lengths by time of day
3. **Completion Rates**: How long users take to complete missions
4. **Engagement Windows**: Peak activity hours
5. **Weekend vs Weekday**: Usage pattern differences

## Performance Impact
- **Database**: Minimal - single indexed timestamp column
- **Storage**: ~8 bytes per mission for timestamp
- **Query Performance**: Optimized with index on `started_at`
- **UI Rendering**: Negligible - formatting is fast

## Future Enhancements

Potential improvements enabled by precise timestamps:
1. **Heatmaps**: Visual representation of walking times
2. **Streaks**: Daily walking streak tracking
3. **Best Times**: Personalized recommendations
4. **Reports**: Weekly/monthly walking reports
5. **Challenges**: Time-based mission challenges

## Rollback (if needed)

If you need to rollback this feature:
```sql
ALTER TABLE missions DROP COLUMN IF EXISTS started_at;
DROP INDEX IF EXISTS idx_missions_started_at;
```

Note: Rollback will lose start time data, but completion times remain intact.
