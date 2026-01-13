/**
 * Mission Generator Service using Newell AI
 * Generates context-aware walking missions based on time of day and real-world location
 */

import { generateText } from '@fastshot/ai';
import { Mission, MissionVibe, EnvironmentType as MissionEnvironmentType, DestinationType } from '@/types/mission';
import { reverseGeocode as googleReverseGeocode, getDisplayName } from '@/services/googleGeocoding';
import { searchMultiTierPOIs, POI } from '@/services/googlePlaces';

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
 * Use EnvironmentType from shared types
 */
export type EnvironmentType = MissionEnvironmentType;

/**
 * Enhanced reverse geocoding with detailed location components
 * Extracts rich contextual data for immersive mission generation
 */
export const getDetailedLocation = async (coords: LocationContext): Promise<DetailedLocationContext> => {
  try {
    console.log('🗺️ Fetching detailed location using Google Geocoding API...');

    const geocodingResult = await googleReverseGeocode(coords);

    if (geocodingResult.success) {
      const displayName = getDisplayName(geocodingResult);

      console.log(`✅ Location resolved: ${displayName}`);

      return {
        displayName,
        neighborhood: geocodingResult.neighborhood || null,
        street: geocodingResult.street || null,
        city: geocodingResult.city || null,
        region: geocodingResult.region || null,
        landmark: geocodingResult.landmark || null,
        postalCode: geocodingResult.postalCode || null,
      };
    }

    // Fallback if geocoding fails
    console.warn('⚠️ Geocoding failed, using fallback location name');
    return {
      displayName: 'Urban Environment',
      neighborhood: null,
      street: null,
      city: null,
      region: null,
      landmark: null,
      postalCode: null,
    };
  } catch (error) {
    console.error('❌ Reverse geocoding exception:', error);
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

/**
 * Calculate target bearing based on environment type and vibe
 * Returns bearing in degrees from north (0-360)
 *
 * Bearings guide users in contextually appropriate directions:
 * - Coastal: Toward/along waterfront
 * - Park: Through green spaces
 * - Historic: Toward historic core
 * - Urban: Through business/cultural districts
 * - Suburban: Through residential areas
 * - Industrial: Through creative districts
 */
const calculateTargetBearing = (envType: EnvironmentType, vibe: MissionVibe): number => {
  // Base bearings by environment (in degrees from north)
  const environmentBearings: Record<EnvironmentType, number[]> = {
    coastal: [270, 180, 225, 315], // West, South, SW, NW - typically toward/along water
    park: [0, 90, 180, 270], // All cardinal directions - explore the park
    historic: [45, 135, 225, 315], // Diagonal directions - weave through old streets
    urban: [0, 90, 180, 270], // Cardinal directions - follow city grid
    suburban: [30, 120, 210, 300], // Offset directions - residential exploration
    industrial: [60, 150, 240, 330], // Varied angles - creative district discovery
    mixed: [0, 45, 90, 135, 180, 225, 270, 315], // All directions - diverse exploration
    unknown: [0, 90, 180, 270], // Cardinal directions - safe default
  };

  // Get possible bearings for this environment
  const possibleBearings = environmentBearings[envType];

  // Select bearing based on vibe (different vibes get different bearings for variety)
  let baseBearing: number;
  if (vibe === 'chill') {
    baseBearing = possibleBearings[0]; // First option - peaceful direction
  } else if (vibe === 'discovery') {
    baseBearing = possibleBearings[possibleBearings.length > 1 ? 1 : 0]; // Second option - exploratory
  } else {
    baseBearing = possibleBearings[possibleBearings.length > 2 ? 2 : 0]; // Third option - challenging
  }

  // Add small random variation (±15 degrees) for natural feeling
  const variation = (Math.random() * 30) - 15;
  const finalBearing = (baseBearing + variation + 360) % 360;

  return Math.round(finalBearing);
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

          // Validate destination type if provided
          const validDestinationTypes: DestinationType[] = [
            'bakery', 'cafe', 'park', 'landmark', 'restaurant', 'shop', 'gallery', 'viewpoint', 'mystery'
          ];
          const destinationType: DestinationType =
            validDestinationTypes.includes(item.destinationType) ? item.destinationType : 'landmark';

          return {
            vibe: item.vibe as MissionVibe,
            title: String(item.title).substring(0, 40), // Ensure title length limit
            description: String(item.description).substring(0, 160), // Ensure description length limit
            stepTarget: Math.max(100, Math.round(Number(item.stepTarget) / 100) * 100), // Round to nearest 100, minimum 100
            destinationType,
            destinationArchetype: item.destinationArchetype ? String(item.destinationArchetype).substring(0, 40) : 'Local Destination',
            destinationNarrative: item.destinationNarrative ? String(item.destinationNarrative).substring(0, 80) : 'A hidden local treasure waiting to be discovered',
          };
        })
        .filter((m: any): m is any => m !== null);

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

/**
 * Get appropriate destination type based on environment and vibe
 */
const getDestinationType = (envType: EnvironmentType, vibe: MissionVibe): DestinationType => {
  if (envType === 'park') return 'park';
  if (envType === 'coastal') return 'viewpoint';
  if (envType === 'historic') return 'landmark';

  // Default based on vibe
  if (vibe === 'chill') return 'cafe';
  if (vibe === 'discovery') return 'landmark';
  return 'viewpoint'; // workout
};

/**
 * Get destination archetype and narrative based on environment
 */
const getDestinationDefaults = (envType: EnvironmentType, vibe: MissionVibe): { archetype: string; narrative: string } => {
  const defaults: Record<EnvironmentType, Record<MissionVibe, { archetype: string; narrative: string }>> = {
    coastal: {
      chill: { archetype: 'The Waterfront Refuge', narrative: 'Where the sound of waves brings instant peace' },
      discovery: { archetype: 'The Maritime Overlook', narrative: 'A hidden spot locals treasure for its ocean views' },
      workout: { archetype: 'The Coastal Challenge Point', narrative: 'Where fitness meets breathtaking scenery' },
    },
    park: {
      chill: { archetype: 'The Tranquil Grove', narrative: 'Nature\'s perfect sanctuary within the city' },
      discovery: { archetype: 'The Secret Garden', narrative: 'A green oasis most visitors never find' },
      workout: { archetype: 'The Summit Trail', narrative: 'Worth every step for the panoramic reward' },
    },
    historic: {
      chill: { archetype: 'The Heritage Cafe', narrative: 'Where history and hospitality blend perfectly' },
      discovery: { archetype: 'The Architectural Gem', narrative: 'A building with stories etched into every stone' },
      workout: { archetype: 'The Historic Heights', narrative: 'Centuries-old paths that still inspire' },
    },
    urban: {
      chill: { archetype: 'The Local Coffee Sanctuary', narrative: 'Where neighborhood life hums with warmth' },
      discovery: { archetype: 'The Urban Art Spot', narrative: 'Street creativity at its most vibrant' },
      workout: { archetype: 'The City Vista Point', narrative: 'Earn your skyline panorama' },
    },
    suburban: {
      chill: { archetype: 'The Neighborhood Haven', narrative: 'Community charm in every corner' },
      discovery: { archetype: 'The Hidden Local Shop', narrative: 'A place regulars keep coming back to' },
      workout: { archetype: 'The Residential Peak', narrative: 'Quiet streets leading to scenic rewards' },
    },
    industrial: {
      chill: { archetype: 'The Warehouse Cafe', narrative: 'Rough edges meet smooth coffee' },
      discovery: { archetype: 'The Urban Canvas', narrative: 'Where grit becomes art' },
      workout: { archetype: 'The Industrial Vista', narrative: 'Raw beauty from unexpected angles' },
    },
    mixed: {
      chill: { archetype: 'The Eclectic Corner', narrative: 'Where diverse neighborhoods converge beautifully' },
      discovery: { archetype: 'The Cultural Intersection', narrative: 'Stories blend at this unique crossroads' },
      workout: { archetype: 'The Diverse Panorama', narrative: 'See the city\'s many faces in one view' },
    },
    unknown: {
      chill: { archetype: 'The Peaceful Spot', narrative: 'A calming place worth finding' },
      discovery: { archetype: 'The Local Landmark', narrative: 'Discover what makes this place special' },
      workout: { archetype: 'The Achievement Point', narrative: 'Reach the destination, earn the view' },
    },
  };

  return defaults[envType][vibe] || defaults.unknown[vibe];
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

  const chillDefaults = getDestinationDefaults(envType, 'chill');
  const discoveryDefaults = getDestinationDefaults(envType, 'discovery');
  const workoutDefaults = getDestinationDefaults(envType, 'workout');

  return [
    // Chill missions (2)
    {
      vibe: 'chill' as MissionVibe,
      title: `The ${period.charAt(0).toUpperCase() + period.slice(1)} Stroll`,
      description: `Take a peaceful walk ${suffix} of ${location}. No rush, just enjoy the journey and let your mind wander freely.`,
      stepTarget: 1000,
      targetBearing: calculateTargetBearing(envType, 'chill'),
      environmentType: envType,
      destinationType: getDestinationType(envType, 'chill'),
      destinationArchetype: chillDefaults.archetype,
      destinationNarrative: chillDefaults.narrative,
    },
    {
      vibe: 'chill' as MissionVibe,
      title: `Mindful Moments Walk`,
      description: `A gentle exploration of ${location}. Breathe deeply, observe your surroundings, and find tranquility in motion.`,
      stepTarget: 1400,
      targetBearing: calculateTargetBearing(envType, 'chill'),
      environmentType: envType,
      destinationType: getDestinationType(envType, 'chill'),
      destinationArchetype: chillDefaults.archetype,
      destinationNarrative: chillDefaults.narrative,
    },
    // Discovery missions (2)
    {
      vibe: 'discovery' as MissionVibe,
      title: `Urban Explorer's Path`,
      description: `Venture beyond your usual routes in ${location}. Find streets you've never walked, discover hidden corners.`,
      stepTarget: 2400,
      targetBearing: calculateTargetBearing(envType, 'discovery'),
      environmentType: envType,
      destinationType: getDestinationType(envType, 'discovery'),
      destinationArchetype: discoveryDefaults.archetype,
      destinationNarrative: discoveryDefaults.narrative,
    },
    {
      vibe: 'discovery' as MissionVibe,
      title: `Hidden Gems Quest`,
      description: `Seek out the secrets of ${location}. Every corner holds a story waiting to be discovered by curious explorers.`,
      stepTarget: 3200,
      targetBearing: calculateTargetBearing(envType, 'discovery'),
      environmentType: envType,
      destinationType: getDestinationType(envType, 'discovery'),
      destinationArchetype: discoveryDefaults.archetype,
      destinationNarrative: discoveryDefaults.narrative,
    },
    // Workout missions (2)
    {
      vibe: 'workout' as MissionVibe,
      title: `The Endurance Trial`,
      description: `Push your limits with this challenging trek ${suffix}. Maintain a brisk pace and feel the energy surge.`,
      stepTarget: 5000,
      targetBearing: calculateTargetBearing(envType, 'workout'),
      environmentType: envType,
      destinationType: getDestinationType(envType, 'workout'),
      destinationArchetype: workoutDefaults.archetype,
      destinationNarrative: workoutDefaults.narrative,
    },
    {
      vibe: 'workout' as MissionVibe,
      title: `Peak Performance Sprint`,
      description: `Conquer ${location} with determination and power. This intense walk will test your stamina and reward your persistence.`,
      stepTarget: 6800,
      targetBearing: calculateTargetBearing(envType, 'workout'),
      environmentType: envType,
      destinationType: getDestinationType(envType, 'workout'),
      destinationArchetype: workoutDefaults.archetype,
      destinationNarrative: workoutDefaults.narrative,
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

🎭 DESTINATION STORYTELLING:
Each mission MUST lead to a specific, real-world destination archetype:
- destinationType: "bakery" | "cafe" | "park" | "landmark" | "restaurant" | "shop" | "gallery" | "viewpoint" | "mystery"
- destinationArchetype: A poetic name (e.g., "A Secret Garden", "The Sourdough Sanctuary", "Hidden Urban Mural")
- destinationNarrative: One compelling sentence explaining WHY this spot is a local treasure (max 80 chars)

FORMAT REQUIREMENTS:
- vibe: "chill" | "discovery" | "workout"
- title: Location-specific name (max 35 chars)
- description: Immersive narrative with sensory details (max 150 chars)
- stepTarget: Specific number within vibe range
- destinationType: One of the types above that fits the environment
- destinationArchetype: Poetic destination name (max 40 chars)
- destinationNarrative: Why visit sentence (max 80 chars)

EXAMPLE (for coastal):
{"vibe": "discovery", "title": "The Maritime Mystery Route", "description": "Hunt for hidden coves along Kitsilano's shoreline. Feel salt spray as you discover secret beach access points locals cherish.", "stepTarget": 2800, "destinationType": "viewpoint", "destinationArchetype": "The Fisherman's Overlook", "destinationNarrative": "Where locals watch sunsets paint the water golden"}

Respond with ONLY a valid JSON array of 6 missions:
[
  {"vibe": "chill", "title": "...", "description": "...", "stepTarget": 900, "destinationType": "...", "destinationArchetype": "...", "destinationNarrative": "..."},
  {"vibe": "chill", "title": "...", "description": "...", "stepTarget": 1400, "destinationType": "...", "destinationArchetype": "...", "destinationNarrative": "..."},
  {"vibe": "discovery", "title": "...", "description": "...", "stepTarget": 2200, "destinationType": "...", "destinationArchetype": "...", "destinationNarrative": "..."},
  {"vibe": "discovery", "title": "...", "description": "...", "stepTarget": 3300, "destinationType": "...", "destinationArchetype": "...", "destinationNarrative": "..."},
  {"vibe": "workout", "title": "...", "description": "...", "stepTarget": 4500, "destinationType": "...", "destinationArchetype": "...", "destinationNarrative": "..."},
  {"vibe": "workout", "title": "...", "description": "...", "stepTarget": 6500, "destinationType": "...", "destinationArchetype": "...", "destinationNarrative": "..."}
]`;

  try {
    const response = await generateText({ prompt });

    if (!response) {
      // Empty AI response, use defaults
      return getDefaultMissions(locationDetails.displayName, environmentType).map((m) => ({
        ...m,
        id: generateId(),
        targetBearing: calculateTargetBearing(environmentType, m.vibe),
        environmentType,
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
        targetBearing: calculateTargetBearing(environmentType, vibe),
        environmentType,
        destinationType: vibeMissions[0]?.destinationType || vibeDefaults[0]?.destinationType || 'landmark',
        destinationArchetype: vibeMissions[0]?.destinationArchetype || vibeDefaults[0]?.destinationArchetype || 'Local Destination',
        destinationNarrative: vibeMissions[0]?.destinationNarrative || vibeDefaults[0]?.destinationNarrative || 'A hidden local treasure',
        generatedAt: new Date(),
      });

      // Add second mission for this vibe
      missions.push({
        id: generateId(),
        vibe,
        title: vibeMissions[1]?.title || vibeDefaults[1]?.title || `${vibe} quest 2`,
        description: vibeMissions[1]?.description || vibeDefaults[1]?.description || 'Another adventure awaits',
        stepTarget: vibeMissions[1]?.stepTarget || vibeDefaults[1]?.stepTarget || 1500,
        targetBearing: calculateTargetBearing(environmentType, vibe),
        environmentType,
        destinationType: vibeMissions[1]?.destinationType || vibeDefaults[1]?.destinationType || 'landmark',
        destinationArchetype: vibeMissions[1]?.destinationArchetype || vibeDefaults[1]?.destinationArchetype || 'Local Destination',
        destinationNarrative: vibeMissions[1]?.destinationNarrative || vibeDefaults[1]?.destinationNarrative || 'A hidden local treasure',
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
      targetBearing: calculateTargetBearing(environmentType, m.vibe),
      environmentType,
      generatedAt: new Date(),
    }));
  }
};

/**
 * ENHANCED: Generate missions with real POI data from Google Places
 * This is the HIGH-QUALITY DISCOVERY ENGINE that searches for real businesses/landmarks
 * NOW WITH DYNAMIC QUEST ROTATION: History-aware filtering, directional bias, daily theming
 */
export const generateMissionsWithRealPOIs = async (location?: LocationContext): Promise<Mission[]> => {
  console.log('🎯 HIGH-QUALITY DISCOVERY ENGINE - Starting with Dynamic Quest Rotation...');

  if (!location) {
    console.warn('⚠️ No location provided, falling back to standard generation');
    return generateMissions(location);
  }

  try {
    // Import rotation utilities (dynamic to avoid circular deps)
    const {
      getBlacklistedPlaceIds,
      getRandomCardinalDirection,
      getDailyTheme,
      getRandomNarrativeSeed,
    } = await import('./questRotation');

    const { period, mood } = getTimeContext();

    // Get detailed location context
    const locationDetails = await getDetailedLocation(location);
    const environmentType = detectEnvironmentType(locationDetails);

    console.log(`📍 Location: ${locationDetails.displayName}`);
    console.log(`🌍 Environment: ${environmentType}`);
    console.log(`⏰ Time: ${period} (${mood})`);

    // ROTATION ENGINE: Get directional bias for this scan
    const { direction, bearing } = getRandomCardinalDirection();
    console.log(`🧭 Directional Shift: Exploring ${direction} (${bearing}°)`);

    // ROTATION ENGINE: Get history blacklist
    const blacklistedPlaceIds = await getBlacklistedPlaceIds();
    console.log(`📜 History Filter: ${blacklistedPlaceIds.length} places in blacklist`);

    // ROTATION ENGINE: Get daily theme
    const dailyTheme = getDailyTheme();
    console.log(`🎨 Daily Theme: ${dailyTheme.emoji} ${dailyTheme.displayName}`);

    // ROTATION ENGINE: Get narrative seed for AI variety
    const narrativeSeed = getRandomNarrativeSeed();
    console.log(`✨ Narrative Focus: ${narrativeSeed.focus}`);

    // Execute 6-tier parallel POI search WITH ROTATION ENGINE
    const poiSearchResult = await searchMultiTierPOIs(location, 4.0, {
      bearingBias: bearing,
      blacklistedPlaceIds,
      categoryWeights: dailyTheme.categoryWeights,
    });

    if (!poiSearchResult.success ||
        (poiSearchResult.tierResults.chill.length === 0 &&
         poiSearchResult.tierResults.discovery.length === 0 &&
         poiSearchResult.tierResults.workout.length === 0)) {
      console.warn('⚠️ No high-quality POIs found, falling back to standard generation');
      return generateMissions(location);
    }

    const { chill, discovery, workout } = poiSearchResult.tierResults;

    console.log('✅ Found high-quality POIs:');
    console.log(`  Chill tier: ${chill.length} POIs`);
    console.log(`  Discovery tier: ${discovery.length} POIs`);
    console.log(`  Workout tier: ${workout.length} POIs`);

    // Build POI context for AI prompt
    const buildPOIContext = (poi: POI, index: number) => {
      return `
POI #${index + 1}:
- Name: "${poi.name}"
- Type: ${poi.types?.join(', ') || 'N/A'}
- Rating: ${poi.rating}★ (${poi.userRatingsTotal || 0} reviews)
- Address: ${poi.address}
- Status: ${poi.isOpenNow ? '🟢 OPEN NOW' : '⚪ Status Unknown'}`;
    };

    const chillPOIContext = chill.map((poi, i) => buildPOIContext(poi, i)).join('\n');
    const discoveryPOIContext = discovery.map((poi, i) => buildPOIContext(poi, i)).join('\n');
    const workoutPOIContext = workout.map((poi, i) => buildPOIContext(poi, i)).join('\n');

    // Build rich location context for AI
    const locationContext = [
      `PRIMARY LOCATION: ${locationDetails.displayName}`,
      locationDetails.neighborhood ? `NEIGHBORHOOD: ${locationDetails.neighborhood}` : null,
      locationDetails.street ? `STREET AREA: ${locationDetails.street}` : null,
      locationDetails.landmark ? `LANDMARK: ${locationDetails.landmark}` : null,
    ].filter(Boolean).join('\n');

    // Get environment-specific descriptors
    const envDescriptors = getEnvironmentDescriptors(environmentType);

    // ENHANCED PROMPT with Real POI Data + NARRATIVE SEED for variety
    const prompt = `You are a LOCAL ADVENTURE GUIDE and URBAN EXPLORER NARRATOR creating personalized walking quests for Stepquest explorers.

🌍 LOCATION INTELLIGENCE:
${locationContext}

ENVIRONMENT TYPE: ${environmentType.toUpperCase()}
${envDescriptors}

TIME CONTEXT: ${period} (atmosphere: ${mood})

🎨 TODAY'S THEME: ${dailyTheme.emoji} ${dailyTheme.displayName}
${dailyTheme.displayName === 'Café Culture Day' ? 'Highlight cozy coffee spots, artisan bakeries, and social gathering places.' : ''}
${dailyTheme.displayName === 'Nature Exploration Day' ? 'Emphasize green spaces, outdoor beauty, and natural landmarks.' : ''}
${dailyTheme.displayName === 'Heritage Discovery Day' ? 'Focus on historical significance, architectural heritage, and cultural landmarks.' : ''}
${dailyTheme.displayName === 'Culinary Adventure Day' ? 'Celebrate food culture, local flavors, and dining experiences.' : ''}
${dailyTheme.displayName === 'Urban Explorer Day' ? 'Discover unique shops, galleries, and hidden urban gems.' : ''}
${dailyTheme.displayName === 'Arts & Culture Day' ? 'Spotlight artistic venues, cultural centers, and creative spaces.' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 REAL-WORLD DESTINATIONS DISCOVERED:

CHILL TIER (500m-1km):
${chillPOIContext || 'No POIs found in this tier'}

DISCOVERY TIER (1.5km-3km):
${discoveryPOIContext || 'No POIs found in this tier'}

WORKOUT TIER (4km-6km):
${workoutPOIContext || 'No POIs found in this tier'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 YOUR MISSION: Create 6 IMMERSIVE walking adventures to these REAL businesses and landmarks.

✨ NARRATIVE SEED (for variety): ${narrativeSeed.instruction}

CRITICAL REQUIREMENTS:
✓ You MUST use the ACTUAL business names provided above (e.g., "Walk to Blue Bottle Coffee")
✓ Write a compelling "Why Visit" story for each REAL destination
✓ Incorporate the business type and atmosphere into the narrative
✓ Reference the SPECIFIC features of these real places
✓ Make explorers excited to discover these HIGH-RATED local gems
✓ Apply the NARRATIVE SEED above to create unique storytelling angles

Generate TWO missions for each tier (use POIs from matching tier):

1️⃣ CHILL (2 missions) - Peaceful walks to nearby spots (800-1500 steps each)
Use POIs from CHILL TIER above. Create short, relaxing journeys.

2️⃣ DISCOVERY (2 missions) - Exploratory walks to interesting places (2000-3500 steps each)
Use POIs from DISCOVERY TIER above. Create curiosity-driven adventures.

3️⃣ WORKOUT (2 missions) - Challenging walks to distant destinations (4000-7000 steps each)
Use POIs from WORKOUT TIER above. Create high-energy expeditions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMAT REQUIREMENTS:
- vibe: "chill" | "discovery" | "workout"
- title: "Walk to [ACTUAL POI NAME]" (max 35 chars, must include real business name)
- description: Immersive story about WHY this place is special (max 150 chars)
- stepTarget: Specific number within vibe range
- destinationType: Type that matches the POI (bakery/cafe/park/etc.)
- destinationArchetype: Poetic title for this destination (max 40 chars)
- destinationNarrative: One sentence WHY visit (max 80 chars)

EXAMPLE:
{"vibe": "chill", "title": "Walk to Bluebells Bakery", "description": "Follow the scent of fresh croissants to this artisan bakery where locals gather. A cozy haven for morning pastries.", "stepTarget": 900, "destinationType": "bakery", "destinationArchetype": "The Sourdough Sanctuary", "destinationNarrative": "Where hand-crafted bread meets neighborhood charm"}

Respond with ONLY a valid JSON array of 6 missions:
[
  {"vibe": "chill", "title": "Walk to [POI Name]", ...},
  {"vibe": "chill", "title": "Walk to [POI Name]", ...},
  {"vibe": "discovery", "title": "Walk to [POI Name]", ...},
  {"vibe": "discovery", "title": "Walk to [POI Name]", ...},
  {"vibe": "workout", "title": "Walk to [POI Name]", ...},
  {"vibe": "workout", "title": "Walk to [POI Name]", ...}
]`;

    // Generate missions using AI with real POI data
    const response = await generateText({ prompt });

    if (!response) {
      console.warn('⚠️ Empty AI response, falling back to standard generation');
      return generateMissions(location);
    }

    const parsedMissions = parseAIResponse(response);

    // Map missions to POIs
    const missions: Mission[] = [];

    const vibeToTier: Record<MissionVibe, POI[]> = {
      chill: chill,
      discovery: discovery,
      workout: workout,
    };

    const vibeStepRanges: Record<MissionVibe, [number, number]> = {
      chill: [800, 1500],
      discovery: [2000, 3500],
      workout: [4000, 7000],
    };

    // For each vibe, create 2 missions
    (['chill', 'discovery', 'workout'] as MissionVibe[]).forEach((vibe, vibeIndex) => {
      const vibePOIs = vibeToTier[vibe];
      const vibeMissions = parsedMissions.filter(m => m.vibe === vibe);
      const [minSteps, maxSteps] = vibeStepRanges[vibe];

      // Create first mission for this vibe
      const poi1 = vibePOIs[0];
      if (poi1) {
        const isNewDiscovery = !blacklistedPlaceIds.includes(poi1.placeId);
        missions.push({
          id: generateId(),
          vibe,
          title: vibeMissions[0]?.title || `Walk to ${poi1.name}`,
          description: vibeMissions[0]?.description || `Discover this highly-rated local destination.`,
          stepTarget: vibeMissions[0]?.stepTarget || Math.floor(minSteps + (maxSteps - minSteps) * 0.4),
          targetBearing: 0, // Will be calculated when user location is known
          environmentType,
          destinationType: vibeMissions[0]?.destinationType || 'mystery',
          destinationArchetype: vibeMissions[0]?.destinationArchetype || poi1.name,
          destinationNarrative: vibeMissions[0]?.destinationNarrative || `A ${poi1.rating}★ rated local gem`,
          realPOI: {
            name: poi1.name,
            address: poi1.address,
            rating: poi1.rating || 0,
            userRatingsTotal: poi1.userRatingsTotal || 0,
            isOpenNow: poi1.isOpenNow || false,
            latitude: poi1.latitude,
            longitude: poi1.longitude,
            placeId: poi1.placeId,
          },
          isNewDiscovery,
          generatedAt: new Date(),
        });
      }

      // Create second mission for this vibe
      const poi2 = vibePOIs[1];
      if (poi2) {
        const isNewDiscovery = !blacklistedPlaceIds.includes(poi2.placeId);
        missions.push({
          id: generateId(),
          vibe,
          title: vibeMissions[1]?.title || `Walk to ${poi2.name}`,
          description: vibeMissions[1]?.description || `Explore this popular local destination.`,
          stepTarget: vibeMissions[1]?.stepTarget || Math.floor(minSteps + (maxSteps - minSteps) * 0.7),
          targetBearing: 0, // Will be calculated when user location is known
          environmentType,
          destinationType: vibeMissions[1]?.destinationType || 'mystery',
          destinationArchetype: vibeMissions[1]?.destinationArchetype || poi2.name,
          destinationNarrative: vibeMissions[1]?.destinationNarrative || `A ${poi2.rating}★ rated local favorite`,
          realPOI: {
            name: poi2.name,
            address: poi2.address,
            rating: poi2.rating || 0,
            userRatingsTotal: poi2.userRatingsTotal || 0,
            isOpenNow: poi2.isOpenNow || false,
            latitude: poi2.latitude,
            longitude: poi2.longitude,
            placeId: poi2.placeId,
          },
          isNewDiscovery,
          generatedAt: new Date(),
        });
      }
    });

    // If we don't have enough missions, fall back to standard generation
    if (missions.length < 3) {
      console.warn('⚠️ Not enough POI-based missions, falling back to standard generation');
      return generateMissions(location);
    }

    // ROTATION ENGINE: Mark these places as "seen" in history (not completed yet)
    const { addToQuestHistory } = await import('./questRotation');
    for (const mission of missions) {
      if (mission.realPOI) {
        await addToQuestHistory(mission.realPOI.placeId, false); // false = seen but not completed
      }
    }

    console.log(`✅ Generated ${missions.length} missions with real POI data`);
    console.log(`🆕 Variety Score: ${poiSearchResult.varietyScore}% new discoveries`);
    return missions;
  } catch (error) {
    console.error('❌ Error in high-quality discovery engine:', error);
    console.log('Falling back to standard mission generation');
    return generateMissions(location);
  }
};
