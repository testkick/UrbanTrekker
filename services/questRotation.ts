/**
 * Quest Rotation Service
 * Implements the Dynamic Quest Rotation Engine to ensure fresh, unique adventures every scan
 *
 * Features:
 * - History-Aware Filtering: Tracks last 20 completed/seen Place IDs to prevent repetition
 * - Daily Theming: Different category weights each day
 * - Directional Bias: Random cardinal direction focus per scan
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const STORAGE_KEYS = {
  QUEST_HISTORY: '@stepquest/quest_history',
  DAILY_THEME_SEED: '@stepquest/daily_theme_seed',
} as const;

// Maximum number of Place IDs to track in history (prevents blacklist)
const MAX_HISTORY_SIZE = 20;

/**
 * Quest history entry tracking visited/seen places
 */
export interface QuestHistoryEntry {
  placeId: string;
  timestamp: number;
  wasCompleted: boolean;
}

/**
 * Daily theme types that influence POI category weights
 */
export type DailyTheme = 'cafe_day' | 'park_day' | 'historic_day' | 'discovery_day' | 'fitness_day' | 'culture_day' | 'food_day';

/**
 * Daily theme configuration
 */
export interface DailyThemeConfig {
  theme: DailyTheme;
  displayName: string;
  emoji: string;
  categoryWeights: {
    cafe: number;
    park: number;
    restaurant: number;
    bakery: number;
    landmark: number;
    shop: number;
    gallery: number;
  };
}

/**
 * Cardinal directions for bearing bias
 */
export type CardinalDirection = 'north' | 'south' | 'east' | 'west';

/**
 * Daily theme configurations
 */
const DAILY_THEMES: DailyThemeConfig[] = [
  {
    theme: 'cafe_day',
    displayName: 'Café Culture Day',
    emoji: '☕',
    categoryWeights: {
      cafe: 3.0,
      bakery: 2.0,
      restaurant: 1.5,
      park: 1.0,
      landmark: 1.0,
      shop: 1.0,
      gallery: 1.0,
    },
  },
  {
    theme: 'park_day',
    displayName: 'Nature Exploration Day',
    emoji: '🌳',
    categoryWeights: {
      park: 3.0,
      landmark: 1.5,
      cafe: 1.0,
      restaurant: 1.0,
      bakery: 1.0,
      shop: 1.0,
      gallery: 1.0,
    },
  },
  {
    theme: 'historic_day',
    displayName: 'Heritage Discovery Day',
    emoji: '🏛️',
    categoryWeights: {
      landmark: 3.0,
      gallery: 2.0,
      cafe: 1.5,
      park: 1.0,
      restaurant: 1.0,
      bakery: 1.0,
      shop: 1.0,
    },
  },
  {
    theme: 'food_day',
    displayName: 'Culinary Adventure Day',
    emoji: '🍽️',
    categoryWeights: {
      restaurant: 3.0,
      bakery: 2.5,
      cafe: 2.0,
      park: 1.0,
      landmark: 1.0,
      shop: 1.0,
      gallery: 1.0,
    },
  },
  {
    theme: 'discovery_day',
    displayName: 'Urban Explorer Day',
    emoji: '🧭',
    categoryWeights: {
      shop: 2.0,
      gallery: 2.0,
      landmark: 2.0,
      cafe: 1.5,
      park: 1.5,
      restaurant: 1.0,
      bakery: 1.0,
    },
  },
  {
    theme: 'culture_day',
    displayName: 'Arts & Culture Day',
    emoji: '🎨',
    categoryWeights: {
      gallery: 3.0,
      landmark: 2.0,
      cafe: 1.5,
      shop: 1.5,
      park: 1.0,
      restaurant: 1.0,
      bakery: 1.0,
    },
  },
  {
    theme: 'fitness_day',
    displayName: 'Active Adventure Day',
    emoji: '💪',
    categoryWeights: {
      park: 2.5,
      landmark: 2.0,
      cafe: 1.5,
      restaurant: 1.5,
      bakery: 1.0,
      shop: 1.0,
      gallery: 1.0,
    },
  },
];

/**
 * Get today's daily theme based on date
 * Theme rotates every 24 hours
 */
export const getDailyTheme = (): DailyThemeConfig => {
  // Use day of year to select theme
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Rotate through themes based on day
  const themeIndex = dayOfYear % DAILY_THEMES.length;
  return DAILY_THEMES[themeIndex];
};

/**
 * Get quest history from storage
 */
export const getQuestHistory = async (): Promise<QuestHistoryEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.QUEST_HISTORY);
    if (data) {
      return JSON.parse(data) as QuestHistoryEntry[];
    }
    return [];
  } catch (error) {
    console.error('Error loading quest history:', error);
    return [];
  }
};

/**
 * Add a Place ID to quest history (seen/completed)
 * Maintains a rolling window of last 20 places
 */
export const addToQuestHistory = async (
  placeId: string,
  wasCompleted: boolean = false
): Promise<void> => {
  try {
    const history = await getQuestHistory();

    // Check if place already exists
    const existingIndex = history.findIndex(entry => entry.placeId === placeId);

    if (existingIndex >= 0) {
      // Update existing entry
      history[existingIndex] = {
        placeId,
        timestamp: Date.now(),
        wasCompleted: wasCompleted || history[existingIndex].wasCompleted,
      };
    } else {
      // Add new entry at the beginning
      history.unshift({
        placeId,
        timestamp: Date.now(),
        wasCompleted,
      });
    }

    // Trim to max size (keep most recent)
    const trimmedHistory = history.slice(0, MAX_HISTORY_SIZE);

    await AsyncStorage.setItem(
      STORAGE_KEYS.QUEST_HISTORY,
      JSON.stringify(trimmedHistory)
    );

    console.log(`📝 Added to quest history: ${placeId} (total: ${trimmedHistory.length}/${MAX_HISTORY_SIZE})`);
  } catch (error) {
    console.error('Error saving quest history:', error);
  }
};

/**
 * Get blacklisted Place IDs (recently seen/completed)
 */
export const getBlacklistedPlaceIds = async (): Promise<string[]> => {
  const history = await getQuestHistory();
  return history.map(entry => entry.placeId);
};

/**
 * Check if a Place ID is in the blacklist
 */
export const isPlaceBlacklisted = async (placeId: string): Promise<boolean> => {
  const blacklist = await getBlacklistedPlaceIds();
  return blacklist.includes(placeId);
};

/**
 * Clear quest history (for testing/reset)
 */
export const clearQuestHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.QUEST_HISTORY);
    console.log('🧹 Quest history cleared');
  } catch (error) {
    console.error('Error clearing quest history:', error);
  }
};

/**
 * Get random cardinal direction for bearing bias
 */
export const getRandomCardinalDirection = (): {
  direction: CardinalDirection;
  bearing: number;
} => {
  const directions: Array<{ direction: CardinalDirection; bearing: number }> = [
    { direction: 'north', bearing: 0 },
    { direction: 'east', bearing: 90 },
    { direction: 'south', bearing: 180 },
    { direction: 'west', bearing: 270 },
  ];

  const randomIndex = Math.floor(Math.random() * directions.length);
  return directions[randomIndex];
};

/**
 * Generate random narrative seed for AI variety
 */
export const getRandomNarrativeSeed = (): {
  focus: string;
  instruction: string;
} => {
  const seeds = [
    {
      focus: 'sensory_details',
      instruction: 'Focus on SENSORY EXPERIENCES: what explorers will see, hear, smell, taste, and feel',
    },
    {
      focus: 'historical_context',
      instruction: 'Focus on HISTORICAL STORIES: the heritage, past events, and time-worn character',
    },
    {
      focus: 'architectural_beauty',
      instruction: 'Focus on ARCHITECTURAL DETAILS: building design, structural features, and aesthetic elements',
    },
    {
      focus: 'local_character',
      instruction: 'Focus on LOCAL PERSONALITY: neighborhood vibe, community culture, and authentic charm',
    },
    {
      focus: 'hidden_discoveries',
      instruction: 'Focus on HIDDEN SECRETS: overlooked details, insider knowledge, and undiscovered gems',
    },
    {
      focus: 'emotional_journey',
      instruction: 'Focus on EMOTIONAL EXPERIENCE: how the walk will make explorers feel and transform',
    },
    {
      focus: 'cultural_significance',
      instruction: 'Focus on CULTURAL MEANING: traditions, artistic expression, and social importance',
    },
  ];

  const randomIndex = Math.floor(Math.random() * seeds.length);
  return seeds[randomIndex];
};

/**
 * Calculate variety score for a set of POIs
 * Higher score = more variety in types and ratings
 */
export const calculateVarietyScore = (
  placeIds: string[],
  history: QuestHistoryEntry[]
): number => {
  // Count how many are new (not in history)
  const historyIds = history.map(h => h.placeId);
  const newPlaces = placeIds.filter(id => !historyIds.includes(id));

  const newPercentage = (newPlaces.length / placeIds.length) * 100;
  return Math.round(newPercentage);
};

/**
 * Log rotation engine status (for diagnostics)
 */
export const logRotationStatus = async (): Promise<void> => {
  const history = await getQuestHistory();
  const theme = getDailyTheme();
  const direction = getRandomCardinalDirection();
  const narrative = getRandomNarrativeSeed();

  console.log('🔄 DYNAMIC QUEST ROTATION ENGINE STATUS:');
  console.log(`  📜 History: ${history.length}/${MAX_HISTORY_SIZE} places tracked`);
  console.log(`  🎨 Daily Theme: ${theme.emoji} ${theme.displayName}`);
  console.log(`  🧭 Random Direction: ${direction.direction} (${direction.bearing}°)`);
  console.log(`  ✨ Narrative Seed: ${narrative.focus}`);
  console.log(`  🆕 New Discovery Rate: ${calculateVarietyScore([], history)}%`);
};
