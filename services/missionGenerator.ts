/**
 * Mission Generator Service using Newell AI
 * Generates context-aware walking missions based on time of day
 */

import { generateText } from '@fastshot/ai';
import { Mission, MissionVibe } from '@/types/mission';

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
  } catch (e) {
    console.log('Failed to parse JSON, using fallback parsing');
  }

  // Fallback: Create default missions if parsing fails
  return getDefaultMissions();
};

// Default missions as fallback
const getDefaultMissions = (): Omit<Mission, 'id' | 'generatedAt'>[] => {
  const { period } = getTimeContext();

  return [
    {
      vibe: 'chill' as MissionVibe,
      title: `The ${period.charAt(0).toUpperCase() + period.slice(1)} Stroll`,
      description: `Take a peaceful walk through your neighborhood. No rush, just enjoy the journey and let your mind wander freely.`,
      stepTarget: 1000,
    },
    {
      vibe: 'discovery' as MissionVibe,
      title: `Urban Explorer's Path`,
      description: `Venture beyond your usual routes. Find a street you've never walked, a building you've never noticed, or a view you've never seen.`,
      stepTarget: 2500,
    },
    {
      vibe: 'workout' as MissionVibe,
      title: `The Endurance Trial`,
      description: `Push your limits with this challenging trek. Maintain a brisk pace and feel the energy surge through every step.`,
      stepTarget: 5000,
    },
  ];
};

/**
 * Generate walking missions using Newell AI
 */
export const generateMissions = async (): Promise<Mission[]> => {
  const { period, mood } = getTimeContext();

  const prompt = `You are a creative quest designer for an urban exploration walking app called Stepquest. Generate 3 unique walking missions for a user during the ${period} (the mood is ${mood}).

Each mission should have a different "vibe":
1. CHILL - A short, relaxing walk (800-1500 steps)
2. DISCOVERY - A scenic exploration walk (2000-3500 steps)
3. WORKOUT - A challenging fitness walk (4000-7000 steps)

For each mission, provide:
- vibe: exactly one of "chill", "discovery", or "workout"
- title: A creative, evocative quest name (max 30 chars)
- description: An immersive narrative description that makes walking feel like an adventure (2-3 sentences, max 150 chars)
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
      console.log('Empty AI response, using defaults');
      return getDefaultMissions().map((m) => ({
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
      const defaults = getDefaultMissions();

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
    return getDefaultMissions().map((m) => ({
      ...m,
      id: generateId(),
      generatedAt: new Date(),
    }));
  }
};
