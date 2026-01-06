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
 * Detailed location context with rich environmental data
 */
export interface DetailedLocationContext {
  displayName: string; // Human-readable name for display
  neighborhood: string | null; // District/subregion
  street: string | null; // Street name
  city: string | null; // City name
  region: string | null; // State/province
  landmark: string | null; // Named landmark if available
  postalCode: string | null; // Postal code for granularity
}

/**
 * Environment type classifications for adaptive mission generation
 */
export type EnvironmentType =
  | 'coastal' // Waterfront, beaches, seawalls
  | 'urban' // Dense city centers, business districts
  | 'suburban' // Residential neighborhoods
  | 'historic' // Old town areas with heritage architecture
  | 'park' // Green spaces, natural areas
  | 'industrial' // Warehouses, factories (for unique urban exploration)
  | 'mixed' // Diverse urban fabric
  | 'unknown'; // Default fallback

/**
 * Enhanced reverse geocoding with detailed location components
 * Extracts rich contextual data for immersive mission generation
 */
export const getDetailedLocation = async (coords: LocationContext): Promise<DetailedLocationContext> => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (results && results.length > 0) {
      const place = results[0];

      // Extract all available components
      const neighborhood = place.subregion || place.district || null;
      const street = place.street || null;
      const city = place.city || null;
      const region = place.region || null;
      const landmark = (place.name && place.name !== place.street) ? place.name : null;
      const postalCode = place.postalCode || null;

      // Build display name (most specific to least specific)
      let displayName = 'Urban Environment';
      if (landmark) {
        displayName = landmark + (city ? `, ${city}` : '');
      } else if (neighborhood) {
        displayName = neighborhood + (city ? `, ${city}` : '');
      } else if (street && city) {
        displayName = `near ${street}, ${city}`;
      } else if (city) {
        displayName = city;
      } else if (region) {
        displayName = region;
      }

      return {
        displayName,
        neighborhood,
        street,
        city,
        region,
        landmark,
        postalCode,
      };
    }

    return {
      displayName: 'Urban Environment',
      neighborhood: null,
      street: null,
      city: null,
      region: null,
      landmark: null,
      postalCode: null,
    };
  } catch {
    return {
      displayName: 'Urban Environment',
      neighborhood: null,
      street: null,
      city: null,
      region: null,
      landmark: null,
      postalCode: null,
    };
  }
};

/**
 * Legacy function for backward compatibility
 */
export const getLocationName = async (coords: LocationContext): Promise<string> => {
  const detailed = await getDetailedLocation(coords);
  return detailed.displayName;
};

/**
 * Detect environment type based on location keywords and patterns
 * This helps tailor mission narratives to the specific atmosphere
 */
const detectEnvironmentType = (location: DetailedLocationContext): EnvironmentType => {
  const searchText = [
    location.displayName,
    location.neighborhood,
    location.landmark,
    location.street,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Coastal indicators
  if (
    searchText.includes('beach') ||
    searchText.includes('seawall') ||
    searchText.includes('waterfront') ||
    searchText.includes('bay') ||
    searchText.includes('coast') ||
    searchText.includes('harbor') ||
    searchText.includes('marina') ||
    searchText.includes('pier')
  ) {
    return 'coastal';
  }

  // Park/Natural indicators
  if (
    searchText.includes('park') ||
    searchText.includes('forest') ||
    searchText.includes('trail') ||
    searchText.includes('garden') ||
    searchText.includes('green') ||
    searchText.includes('nature')
  ) {
    return 'park';
  }

  // Historic indicators
  if (
    searchText.includes('old town') ||
    searchText.includes('historic') ||
    searchText.includes('heritage') ||
    searchText.includes('colonial') ||
    searchText.includes('downtown') ||
    searchText.includes('gastown') ||
    searchText.includes('chinatown')
  ) {
    return 'historic';
  }

  // Urban indicators
  if (
    searchText.includes('financial') ||
    searchText.includes('business') ||
    searchText.includes('downtown') ||
    searchText.includes('central') ||
    searchText.includes('plaza') ||
    searchText.includes('square')
  ) {
    return 'urban';
  }

  // Suburban indicators
  if (
    searchText.includes('residential') ||
    searchText.includes('heights') ||
    searchText.includes('hills') ||
    searchText.includes('estates')
  ) {
    return 'suburban';
  }

  // Industrial indicators
  if (
    searchText.includes('industrial') ||
    searchText.includes('warehouse') ||
    searchText.includes('port')
  ) {
    return 'industrial';
  }

  // Default to mixed urban environment
  return 'mixed';
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
        console.warn('AI response is not an array');
        return []; // Return empty, let caller handle defaults
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

  // Return empty array, let caller handle defaults with proper context
  return [];
};

// Environment-aware default missions as fallback (2 per vibe = 6 total)
const getDefaultMissions = (locationName: string, envType: EnvironmentType): Omit<Mission, 'id' | 'generatedAt'>[] => {
  const { period } = getTimeContext();
  const location = locationName || 'your neighborhood';

  // Customize defaults based on environment type
  const environmentSuffix: Record<EnvironmentType, string> = {
    coastal: 'along the waterfront',
    park: 'through the green spaces',
    historic: 'past historic architecture',
    urban: 'through the city streets',
    suburban: 'around the neighborhood',
    industrial: 'through the urban landscape',
    mixed: 'through diverse streets',
    unknown: 'around the area',
  };

  const suffix = environmentSuffix[envType];

  return [
    // Chill missions (2)
    {
      vibe: 'chill' as MissionVibe,
      title: `The ${period.charAt(0).toUpperCase() + period.slice(1)} Stroll`,
      description: `Take a peaceful walk ${suffix} of ${location}. No rush, just enjoy the journey and let your mind wander freely.`,
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
      description: `Venture beyond your usual routes in ${location}. Find streets you've never walked, discover hidden corners.`,
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
      description: `Push your limits with this challenging trek ${suffix}. Maintain a brisk pace and feel the energy surge.`,
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
 * Generate environment-specific descriptive hints for the AI
 * These help the AI create missions that match the location's character
 */
const getEnvironmentDescriptors = (envType: EnvironmentType): string => {
  switch (envType) {
    case 'coastal':
      return 'This is a COASTAL environment. Missions should reference: ocean views, sea breezes, waterfront paths, shoreline sounds, salt air, maritime atmosphere, waves, tides, nautical features, beach trails, coastal landmarks, harbor views, or seaside promenades.';
    case 'park':
      return 'This is a PARK/NATURAL environment. Missions should reference: tree canopies, garden paths, natural trails, birdsong, green spaces, flowering plants, fresh air, woodland atmosphere, park benches, open meadows, shaded groves, or natural landmarks.';
    case 'historic':
      return 'This is a HISTORIC district. Missions should reference: heritage architecture, cobblestone streets, vintage buildings, cultural landmarks, historic plaques, old-world charm, architectural details, preserved facades, time-worn pathways, or stories etched in stone.';
    case 'urban':
      return 'This is an URBAN/BUSINESS district. Missions should reference: glass towers, modern architecture, bustling sidewalks, street art, urban energy, city rhythms, contemporary design, office buildings, plazas, street performers, cafes, or metropolitan atmosphere.';
    case 'suburban':
      return 'This is a RESIDENTIAL/SUBURBAN area. Missions should reference: tree-lined streets, neighborhood character, residential architecture, community parks, quiet sidewalks, local shops, residential charm, peaceful boulevards, or neighborhood landmarks.';
    case 'industrial':
      return 'This is an INDUSTRIAL area. Missions should reference: warehouse conversions, raw urban texture, brick facades, industrial heritage, creative districts, converted spaces, street art, urban renewal, gritty charm, or repurposed architecture.';
    case 'mixed':
      return 'This is a MIXED URBAN environment. Missions should reference: diverse streetscapes, varied architecture, neighborhood transitions, eclectic shops, urban texture, local character, street-level discoveries, or the unique blend of old and new.';
    default:
      return 'This is an URBAN environment. Missions should reference: local architecture, street character, neighborhood atmosphere, urban landmarks, city textures, or distinctive features of the area.';
  }
};

/**
 * Generate vibe-specific tone guidance for adaptive mission narratives
 */
const getVibeToneGuidance = (vibe: MissionVibe, envType: EnvironmentType): string => {
  const guides: Record<MissionVibe, Record<EnvironmentType, string>> = {
    chill: {
      coastal: 'TONE: Serene and meditative. Emphasize the calming rhythm of waves, peaceful ocean presence, gentle sea breezes.',
      park: 'TONE: Tranquil and restorative. Focus on natural peace, quiet contemplation under trees, gentle bird melodies.',
      historic: 'TONE: Contemplative and timeless. Highlight the peaceful presence of history, quiet cobblestone charm, slow-paced reflection.',
      urban: 'TONE: Mindful urban zen. Find calm amid city energy, peaceful people-watching, moments of stillness in motion.',
      suburban: 'TONE: Neighborly and comfortable. Emphasize community warmth, familiar paths, friendly residential rhythms.',
      industrial: 'TONE: Quietly creative. Discover unexpected peace in raw spaces, contemplative urban textures, artistic serenity.',
      mixed: 'TONE: Eclectic calm. Blend diverse atmospheres, find peace in variety, relaxed neighborhood exploration.',
      unknown: 'TONE: Peaceful and mindful. Focus on relaxation, gentle observation, stress-free exploration.',
    },
    discovery: {
      coastal: 'TONE: Adventurous exploration. Hunt for hidden beach access, discover maritime history, find unique shoreline features.',
      park: 'TONE: Nature detective. Seek hidden trails, discover natural wonders, find secret garden corners, explore ecological diversity.',
      historic: 'TONE: Urban archaeologist. Uncover architectural secrets, discover historical narratives, find hidden heritage details, explore time layers.',
      urban: 'TONE: Modern explorer. Hunt for street art, discover architectural innovation, find hidden plazas, explore cultural hotspots.',
      suburban: 'TONE: Neighborhood curator. Discover community gems, find local secrets, explore residential character, uncover hidden parks.',
      industrial: 'TONE: Creative scout. Seek artistic transformations, discover warehouse culture, find design innovations, explore urban evolution.',
      mixed: 'TONE: Urban anthropologist. Document neighborhood diversity, discover cultural intersections, explore eclectic character.',
      unknown: 'TONE: Curious explorer. Emphasize discovery, finding the unexpected, uncovering local secrets, observant wandering.',
    },
    workout: {
      coastal: 'TONE: Athletic challenge against elements. Power through coastal winds, conquer waterfront terrain, build stamina with ocean views.',
      park: 'TONE: Natural athlete. Tackle park hills, power through trails, build endurance in fresh air, challenge yourself in nature.',
      historic: 'TONE: Heritage warrior. Conquer historic hills, power through ancient streets, build strength with cultural motivation, determined pace.',
      urban: 'TONE: Urban athlete. Dominate city blocks, power through metropolitan energy, maintain intensity, claim the streets.',
      suburban: 'TONE: Neighborhood champion. Master residential routes, power through community pride, build local endurance, own your territory.',
      industrial: 'TONE: Gritty determination. Tackle raw urban terrain, power through industrial grit, build resilience, embrace the edge.',
      mixed: 'TONE: Versatile warrior. Adapt to changing terrain, power through diverse environments, build all-around stamina.',
      unknown: 'TONE: Determined challenge. Focus on pushing limits, building endurance, maintaining pace, achieving strength goals.',
    },
  };

  return guides[vibe][envType] || guides[vibe].unknown;
};

/**
 * Generate walking missions using Newell AI with deep location awareness
 * @param location Optional GPS coordinates for location-aware missions
 */
export const generateMissions = async (location?: LocationContext): Promise<Mission[]> => {
  const { period, mood } = getTimeContext();

  // Get detailed location context
  let locationDetails: DetailedLocationContext = {
    displayName: 'Urban Environment',
    neighborhood: null,
    street: null,
    city: null,
    region: null,
    landmark: null,
    postalCode: null,
  };

  let environmentType: EnvironmentType = 'unknown';

  if (location) {
    locationDetails = await getDetailedLocation(location);
    environmentType = detectEnvironmentType(locationDetails);
  }

  // Build rich location context for AI
  const locationContext = [
    `PRIMARY LOCATION: ${locationDetails.displayName}`,
    locationDetails.neighborhood ? `NEIGHBORHOOD: ${locationDetails.neighborhood}` : null,
    locationDetails.street ? `STREET AREA: ${locationDetails.street}` : null,
    locationDetails.landmark ? `LANDMARK: ${locationDetails.landmark}` : null,
  ].filter(Boolean).join('\n');

  // Get environment-specific descriptors
  const envDescriptors = getEnvironmentDescriptors(environmentType);

  // Comprehensive immersive prompt
  const prompt = `You are a LOCAL ADVENTURE GUIDE and URBAN EXPLORER NARRATOR creating personalized walking quests for Stepquest explorers.

🌍 LOCATION INTELLIGENCE:
${locationContext}

ENVIRONMENT TYPE: ${environmentType.toUpperCase()}
${envDescriptors}

TIME CONTEXT: ${period} (atmosphere: ${mood})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 YOUR MISSION: Generate 6 DEEPLY LOCATION-SPECIFIC walking adventures that capture the SOUL of this exact place.

CRITICAL REQUIREMENTS:
✓ Every mission MUST feel like it could ONLY happen in ${locationDetails.displayName}
✓ Reference SPECIFIC environmental features (NOT generic "walk around")
✓ Use sensory details: what they'll see, hear, smell, feel
✓ Incorporate LOCAL character and atmosphere
✓ Make each mission a STORY, not just a walk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate TWO missions for each vibe:

1️⃣ CHILL (2 missions) - Peaceful, meditative walks (800-1500 steps each)
${getVibeToneGuidance('chill', environmentType)}

2️⃣ DISCOVERY (2 missions) - Exploratory, curiosity-driven walks (2000-3500 steps each)
${getVibeToneGuidance('discovery', environmentType)}

3️⃣ WORKOUT (2 missions) - High-energy, challenging walks (4000-7000 steps each)
${getVibeToneGuidance('workout', environmentType)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMAT REQUIREMENTS:
- vibe: "chill" | "discovery" | "workout"
- title: Location-specific name (max 35 chars)
- description: Immersive narrative with sensory details (max 150 chars)
- stepTarget: Specific number within vibe range

EXAMPLE (for coastal):
{"vibe": "discovery", "title": "The Maritime Mystery Route", "description": "Hunt for hidden coves along Kitsilano's shoreline. Feel salt spray as you discover secret beach access points locals cherish.", "stepTarget": 2800}

Respond with ONLY a valid JSON array of 6 missions:
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
      return getDefaultMissions(locationDetails.displayName, environmentType).map((m) => ({
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

    const defaults = getDefaultMissions(locationDetails.displayName, environmentType);
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
    return getDefaultMissions(locationDetails.displayName, environmentType).map((m) => ({
      ...m,
      id: generateId(),
      generatedAt: new Date(),
    }));
  }
};
