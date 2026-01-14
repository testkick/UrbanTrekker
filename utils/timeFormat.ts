/**
 * Professional timestamp formatting utilities for the Urban Explorer Journal
 * Provides high-end, clean typography for displaying mission timestamps
 */

/**
 * Format a date timestamp to a professional display format
 * Example: "Monday, Oct 24 • 4:15 PM"
 *
 * @param timestamp ISO 8601 timestamp or Date object
 * @returns Formatted string with day, date, and time
 */
export const formatMissionTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  // Format day of week
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

  // Format month and day
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();

  // Format time
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dayOfWeek}, ${month} ${day} • ${time}`;
};

/**
 * Format just the time portion of a timestamp
 * Example: "4:15 PM"
 *
 * @param timestamp ISO 8601 timestamp or Date object
 * @returns Formatted time string
 */
export const formatMissionTime = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format just the date portion of a timestamp
 * Example: "Monday, Oct 24"
 *
 * @param timestamp ISO 8601 timestamp or Date object
 * @returns Formatted date string
 */
export const formatMissionDate = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();

  return `${dayOfWeek}, ${month} ${day}`;
};

/**
 * Format a time range showing start and end times
 * Example: "4:15 PM → 4:29 PM"
 *
 * @param startTime ISO 8601 timestamp or Date object
 * @param endTime ISO 8601 timestamp or Date object
 * @returns Formatted time range string
 */
export const formatTimeRange = (
  startTime: string | Date,
  endTime: string | Date
): string => {
  const start = formatMissionTime(startTime);
  const end = formatMissionTime(endTime);

  return `${start} → ${end}`;
};

/**
 * Format duration in a human-friendly way
 * Example: "14 min walk" or "1 hr 24 min walk"
 *
 * @param durationMinutes Duration in minutes
 * @returns Formatted duration string
 */
export const formatDuration = (durationMinutes: number): string => {
  if (durationMinutes < 60) {
    return `${durationMinutes} min walk`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr walk`;
  }

  return `${hours} hr ${minutes} min walk`;
};

/**
 * Get a relative time description (e.g., "Today", "Yesterday", or full date)
 * Example: "Today" or "Yesterday" or "Monday, Oct 24"
 *
 * @param timestamp ISO 8601 timestamp or Date object
 * @returns Relative or formatted date string
 */
export const formatRelativeDate = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();

  // Check if it's today
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return 'Today';
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  // Check if it's within the last week
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date > weekAgo) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Otherwise, return full date
  return formatMissionDate(date);
};

/**
 * Format a complete mission timestamp for the Journal
 * Example: "Today • 4:15 PM → 4:29 PM" or "Monday, Oct 24 • 4:15 PM"
 *
 * @param startTime ISO 8601 timestamp or Date object
 * @param endTime ISO 8601 timestamp or Date object (optional, if showing range)
 * @returns Complete formatted timestamp for Journal entry
 */
export const formatJournalTimestamp = (
  startTime: string | Date,
  endTime?: string | Date
): string => {
  const relativeDate = formatRelativeDate(startTime);
  const startTimeStr = formatMissionTime(startTime);

  if (endTime) {
    const endTimeStr = formatMissionTime(endTime);
    return `${relativeDate} • ${startTimeStr} → ${endTimeStr}`;
  }

  return `${relativeDate} • ${startTimeStr}`;
};
