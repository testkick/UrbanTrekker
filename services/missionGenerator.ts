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

// Parse AI response into missions
const parseAIResponse = (response: string): Omit<Mission, 'id' | 'generatedAt'>[] => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: { vibe: MissionVibe; title: string; description: string; stepTarget: number }) => ({
        vibe: item.vibe as MissionVibe,
        title: item.title,
        description: item.description,
        stepTarget: Math.round(item.stepTarget / 100) * 100, // Round to nearest 100
      }));
    }
  } catch {
    // JSON parsing failed, use fallback
  }

  // Fallback: Create default missions if parsing fails
  return getDefaultMissions();
};

// Default missions as fallback
const getDefaultMissions = (locationName?: string): Omit<Mission, 'id' | 'generatedAt'>[] => {
  const { period } = getTimeContext();
  const location = locationName || 'your neighborhood';

  return [
    {
      vibe: 'chill' as MissionVibe,
      title: `The ${period.charAt(0).toUpperCase() + period.slice(1)} Stroll`,
      description: `Take a peaceful walk through ${location}. No rush, just enjoy the journey and let your mind wander freely.`,
      stepTarget: 1000,
    },
    {
      vibe: 'discovery' as MissionVibe,
      title: `Urban Explorer's Path`,
      description: `Venture beyond your usual routes in ${location}. Find a street you've never walked, a building you've never noticed.`,
      stepTarget: 2500,
    },
    {
      vibe: 'workout' as MissionVibe,
      title: `The Endurance Trial`,
      description: `Push your limits with this challenging trek around ${location}. Maintain a brisk pace and feel the energy surge.`,
      stepTarget: 5000,
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

  const prompt = `You are a creative quest designer for an urban exploration walking app called Stepquest. Generate 3 unique walking missions for a user during the ${period} (the mood is ${mood}).

The user is currently at ${locationName}. Incorporate this environment into the mission narrative - reference local landmarks, typical features of such areas, or the atmosphere of this location.

Each mission should have a different "vibe":
1. CHILL - A short, relaxing walk (800-1500 steps)
2. DISCOVERY - A scenic exploration walk (2000-3500 steps)
3. WORKOUT - A challenging fitness walk (4000-7000 steps)

For each mission, provide:
- vibe: exactly one of "chill", "discovery", or "workout"
- title: A creative, evocative quest name that could reference the location (max 30 chars)
- description: An immersive narrative description that makes walking feel like an adventure and incorporates the ${locationName} environment (2-3 sentences, max 150 chars)
- stepTarget: A specific integer step goal within the vibe's range

Respond ONLY with a valid JSON array, no other text:
[
  {"vibe": "chill", "title": "...", "description": "...", "stepTarget": 1200},
  {"vibe": "discovery", "title": "...", "description": "...", "stepTarget": 2800},
  {"vibe": "workout", "title": "...", "description": "...", "stepTarget": 5500}
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

    // Ensure we have exactly 3 missions with correct vibes
    const vibes: MissionVibe[] = ['chill', 'discovery', 'workout'];
    const missions: Mission[] = vibes.map((vibe, index) => {
      const found = parsedMissions.find((m) => m.vibe === vibe);
      const defaults = getDefaultMissions(locationName);

      return {
        id: generateId(),
        vibe,
        title: found?.title || defaults[index].title,
        description: found?.description || defaults[index].description,
        stepTarget: found?.stepTarget || defaults[index].stepTarget,
        generatedAt: new Date(),
      };
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
