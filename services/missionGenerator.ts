/**
 * Mission Generator Service using Newell AI
 * Generates context-aware walking missions based on time of day and real-world location
 */

import { generateText } from '@fastshot/ai';
import * as Location from 'expo-location';
import { Mission, MissionVibe } from '@/types/mission';

// Location context for missions
export interface LocationContext {
  latitude: number;
  longitude: number;
}

// Get time of day context
const getTimeContext = (): { period: string; mood: string } => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 9) {
    return { period: 'early morning', mood: 'fresh and energizing' };
  } else if (hour >= 9 && hour < 12) {
    return { period: 'morning', mood: 'productive and bright' };
  } else if (hour >= 12 && hour < 14) {
    return { period: 'midday', mood: 'active and sunny' };
  } else if (hour >= 14 && hour < 17) {
    return { period: 'afternoon', mood: 'warm and leisurely' };
  } else if (hour >= 17 && hour < 20) {
    return { period: 'evening', mood: 'golden hour and reflective' };
  } else if (hour >= 20 && hour < 23) {
    return { period: 'night', mood: 'mysterious and calm' };
  } else {
    return { period: 'late night', mood: 'quiet and adventurous' };
  }
};

/**
 * Reverse geocode coordinates to get a readable location name
 * Exported for use in scan location logging
 */
export const getLocationName = async (coords: LocationContext): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (results && results.length > 0) {
      const place = results[0];

      // Build a descriptive location string
      const parts: string[] = [];

      // Add neighborhood/district if available
      if (place.subregion) {
        parts.push(place.subregion);
      } else if (place.district) {
        parts.push(place.district);
      } else if (place.name && place.name !== place.street) {
        parts.push(place.name);
      }

      // Add city
      if (place.city) {
        parts.push(place.city);
      }

      // If we have parts, join them
      if (parts.length > 0) {
        return parts.join(', ');
      }

      // Fallback to street if available
      if (place.street) {
        return `near ${place.street}${place.city ? `, ${place.city}` : ''}`;
      }

      // Ultimate fallback
      if (place.region) {
        return place.region;
      }
    }

    return 'Urban Environment';
  } catch {
    // Reverse geocoding failed, use fallback
    return 'Urban Environment';
  }
};

// Generate unique ID
const generateId = (): string => {
  return `mission_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Parse AI response into missions with robust error handling
const parseAIResponse = (response: string): Omit<Mission, 'id' | 'generatedAt'>[] => {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Try to extract JSON array from the response
    const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate that we have an array
      if (!Array.isArray(parsed)) {
        console.warn('AI response is not an array, using defaults');
        return getDefaultMissions();
      }

      // Map and validate each mission
      const missions = parsed
        .map((item: any) => {
          // Validate required fields
          if (!item.vibe || !item.title || !item.description || !item.stepTarget) {
            console.warn('Invalid mission structure:', item);
            return null;
          }

          // Validate vibe is one of the allowed values
          const validVibes: MissionVibe[] = ['chill', 'discovery', 'workout'];
          if (!validVibes.includes(item.vibe)) {
            console.warn('Invalid vibe:', item.vibe);
            return null;
          }

          return {
            vibe: item.vibe as MissionVibe,
            title: String(item.title).substring(0, 40), // Ensure title length limit
            description: String(item.description).substring(0, 160), // Ensure description length limit
            stepTarget: Math.max(100, Math.round(Number(item.stepTarget) / 100) * 100), // Round to nearest 100, minimum 100
          };
        })
        .filter((m): m is Omit<Mission, 'id' | 'generatedAt'> => m !== null);

      // If we got at least some valid missions, return them (fallback will fill the rest)
      if (missions.length > 0) {
        console.log(`Successfully parsed ${missions.length} missions from AI`);
        return missions;
      }
    }

    console.warn('No valid JSON array found in AI response');
  } catch (error) {
    // JSON parsing failed
    console.error('Failed to parse AI response:', error);
  }

  // Fallback: Create default missions if parsing fails
  console.log('Using default missions as fallback');
  return getDefaultMissions();
};

// Default missions as fallback (2 per vibe = 6 total)
const getDefaultMissions = (locationName?: string): Omit<Mission, 'id' | 'generatedAt'>[] => {
  const { period } = getTimeContext();
  const location = locationName || 'your neighborhood';

  return [
    // Chill missions (2)
    {
      vibe: 'chill' as MissionVibe,
      title: `The ${period.charAt(0).toUpperCase() + period.slice(1)} Stroll`,
      description: `Take a peaceful walk through ${location}. No rush, just enjoy the journey and let your mind wander freely.`,
      stepTarget: 1000,
    },
    {
      vibe: 'chill' as MissionVibe,
      title: `Mindful Moments Walk`,
      description: `A gentle exploration of ${location}. Breathe deeply, observe your surroundings, and find tranquility in motion.`,
      stepTarget: 1400,
    },
    // Discovery missions (2)
    {
      vibe: 'discovery' as MissionVibe,
      title: `Urban Explorer's Path`,
      description: `Venture beyond your usual routes in ${location}. Find a street you've never walked, a building you've never noticed.`,
      stepTarget: 2400,
    },
    {
      vibe: 'discovery' as MissionVibe,
      title: `Hidden Gems Quest`,
      description: `Seek out the secrets of ${location}. Every corner holds a story waiting to be discovered by curious explorers.`,
      stepTarget: 3200,
    },
    // Workout missions (2)
    {
      vibe: 'workout' as MissionVibe,
      title: `The Endurance Trial`,
      description: `Push your limits with this challenging trek around ${location}. Maintain a brisk pace and feel the energy surge.`,
      stepTarget: 5000,
    },
    {
      vibe: 'workout' as MissionVibe,
      title: `Peak Performance Sprint`,
      description: `Conquer ${location} with determination and power. This intense walk will test your stamina and reward your persistence.`,
      stepTarget: 6800,
    },
  ];
};

/**
 * Generate walking missions using Newell AI
 * @param location Optional GPS coordinates for location-aware missions
 */
export const generateMissions = async (location?: LocationContext): Promise<Mission[]> => {
  const { period, mood } = getTimeContext();

  // Get location name from coordinates if provided
  let locationName = 'Urban Environment';
  if (location) {
    locationName = await getLocationName(location);
  }

  const prompt = `You are a creative quest designer for an urban exploration walking app called Stepquest. Generate 6 unique walking missions for a user during the ${period} (the mood is ${mood}).

The user is currently at ${locationName}. IMPORTANT: Each mission MUST incorporate this specific environment into its narrative. Reference local landmarks, neighborhood characteristics, street names, parks, or distinctive features of ${locationName}. Make the player feel like they're embarking on a location-specific adventure, not a generic walk.

Generate TWO distinct missions for each of these three vibes:
1. CHILL (2 missions) - Short, relaxing walks (800-1500 steps each, different targets)
2. DISCOVERY (2 missions) - Scenic exploration walks (2000-3500 steps each, different targets)
3. WORKOUT (2 missions) - Challenging fitness walks (4000-7000 steps each, different targets)

For each mission, provide:
- vibe: exactly one of "chill", "discovery", or "workout"
- title: A creative, evocative quest name that references ${locationName} or its features (max 35 chars)
- description: An immersive narrative that weaves in the ${locationName} environment - mention specific area types, landmarks, or atmosphere (2-3 sentences, max 150 chars)
- stepTarget: A specific integer step goal within the vibe's range (ensure each pair of missions in the same vibe has different targets)

Example for a coastal area:
{"vibe": "chill", "title": "The Seawall Sunset Stroll", "description": "Walk along the Kitsilano Seawall as golden light dances on the waves. Let the ocean breeze guide your peaceful journey.", "stepTarget": 1000}

Respond ONLY with a valid JSON array of 6 missions, no other text:
[
  {"vibe": "chill", "title": "...", "description": "...", "stepTarget": 900},
  {"vibe": "chill", "title": "...", "description": "...", "stepTarget": 1400},
  {"vibe": "discovery", "title": "...", "description": "...", "stepTarget": 2200},
  {"vibe": "discovery", "title": "...", "description": "...", "stepTarget": 3300},
  {"vibe": "workout", "title": "...", "description": "...", "stepTarget": 4500},
  {"vibe": "workout", "title": "...", "description": "...", "stepTarget": 6500}
]`;

  try {
    const response = await generateText({ prompt });

    if (!response) {
      // Empty AI response, use defaults
      return getDefaultMissions(locationName).map((m) => ({
        ...m,
        id: generateId(),
        generatedAt: new Date(),
      }));
    }

    const parsedMissions = parseAIResponse(response);

    // Ensure we have exactly 6 missions (2 per vibe)
    // Group by vibe and ensure we have 2 of each
    const missionsByVibe: Record<MissionVibe, typeof parsedMissions> = {
      chill: parsedMissions.filter(m => m.vibe === 'chill'),
      discovery: parsedMissions.filter(m => m.vibe === 'discovery'),
      workout: parsedMissions.filter(m => m.vibe === 'workout'),
    };

    const defaults = getDefaultMissions(locationName);
    const missions: Mission[] = [];

    // For each vibe, get 2 missions (or use defaults if needed)
    (['chill', 'discovery', 'workout'] as MissionVibe[]).forEach((vibe) => {
      const vibeMissions = missionsByVibe[vibe];
      const vibeDefaults = defaults.filter(m => m.vibe === vibe);

      // Add first mission for this vibe
      missions.push({
        id: generateId(),
        vibe,
        title: vibeMissions[0]?.title || vibeDefaults[0]?.title || `${vibe} quest`,
        description: vibeMissions[0]?.description || vibeDefaults[0]?.description || 'An adventure awaits',
        stepTarget: vibeMissions[0]?.stepTarget || vibeDefaults[0]?.stepTarget || 1000,
        generatedAt: new Date(),
      });

      // Add second mission for this vibe
      missions.push({
        id: generateId(),
        vibe,
        title: vibeMissions[1]?.title || vibeDefaults[1]?.title || `${vibe} quest 2`,
        description: vibeMissions[1]?.description || vibeDefaults[1]?.description || 'Another adventure awaits',
        stepTarget: vibeMissions[1]?.stepTarget || vibeDefaults[1]?.stepTarget || 1500,
        generatedAt: new Date(),
      });
    });

    return missions;
  } catch (error) {
    console.error('Mission generation error:', error);
    // Return default missions on error
    return getDefaultMissions(locationName).map((m) => ({
      ...m,
      id: generateId(),
      generatedAt: new Date(),
    }));
  }
};
