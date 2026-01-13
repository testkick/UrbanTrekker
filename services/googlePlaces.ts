/**
 * Google Places API Service
 * Searches for real-world POIs matching mission destination types
 */

import Constants from 'expo-constants';
import { DestinationType } from '@/types/mission';

// Try multiple sources for API key: process.env first, then expo-constants extra config
const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

export interface POI {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  types?: string[];
  rating?: number;
  userRatingsTotal?: number;
  isOpenNow?: boolean;
  priceLevel?: number;
  vicinity?: string;
}

export interface POIResult {
  success: boolean;
  poi?: POI;
  error?: string;
}

export interface MultiPOIResult {
  success: boolean;
  pois: POI[];
  error?: string;
}

/**
 * Map mission destination types to Google Places API types
 */
const DESTINATION_TYPE_MAPPING: Record<DestinationType, string[]> = {
  bakery: ['bakery', 'cafe'],
  cafe: ['cafe', 'coffee_shop'],
  park: ['park'],
  landmark: ['tourist_attraction', 'point_of_interest'],
  restaurant: ['restaurant'],
  shop: ['store', 'shopping_mall'],
  gallery: ['art_gallery', 'museum'],
  viewpoint: ['tourist_attraction', 'park'],
  mystery: ['point_of_interest', 'tourist_attraction'],
};

/**
 * Search for high-quality POIs matching destination type
 * ENHANCED: Filters for open_now=true and rating > 4.0
 */
export async function findHighQualityPOIs(
  location: { latitude: number; longitude: number },
  destinationType: DestinationType,
  radius: number = 2000,
  minRating: number = 4.0,
  maxResults: number = 5
): Promise<MultiPOIResult> {
  if (!GOOGLE_API_KEY) {
    console.error('Google Places API key not found');
    return {
      success: false,
      pois: [],
      error: 'API key not configured',
    };
  }

  try {
    const types = DESTINATION_TYPE_MAPPING[destinationType] || ['point_of_interest'];
    const locationStr = `${location.latitude},${location.longitude}`;
    const allPOIs: POI[] = [];

    // Try each type and collect high-quality results
    for (const type of types) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${locationStr}&radius=${radius}&type=${type}&opennow=true&key=${GOOGLE_API_KEY}`;

      console.log(`🔍 Searching for ${type} within ${radius}m (open now, high quality)...`);

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Filter for high-quality places (rating >= minRating)
        const qualityPlaces = data.results
          .filter((place: any) => {
            const hasRating = place.rating !== undefined;
            const meetsMinRating = place.rating >= minRating;
            const isOpen = place.opening_hours?.open_now !== false;
            return hasRating && meetsMinRating && isOpen;
          })
          .slice(0, maxResults)
          .map((place: any) => ({
            name: place.name,
            address: place.vicinity || place.formatted_address || '',
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            placeId: place.place_id,
            types: place.types,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            isOpenNow: place.opening_hours?.open_now || false,
            priceLevel: place.price_level,
            vicinity: place.vicinity,
          }));

        allPOIs.push(...qualityPlaces);
        console.log(`  ✅ Found ${qualityPlaces.length} high-quality ${type}(s)`);
      } else {
        console.log(`  ⚠️ No results for ${type}: ${data.status}`);
      }
    }

    // Sort by rating (highest first)
    allPOIs.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return {
      success: allPOIs.length > 0,
      pois: allPOIs.slice(0, maxResults),
      error: allPOIs.length === 0 ? 'No high-quality POIs found nearby' : undefined,
    };
  } catch (error) {
    console.error('Error searching for high-quality POIs:', error);
    return {
      success: false,
      pois: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for the nearest POI matching the destination type
 * Uses Google Places Nearby Search API
 */
export async function findNearestPOI(
  location: { latitude: number; longitude: number },
  destinationType: DestinationType,
  radius: number = 2000 // Search within 2km
): Promise<POIResult> {
  if (!GOOGLE_API_KEY) {
    console.error('Google Places API key not found');
    return {
      success: false,
      error: 'API key not configured',
    };
  }

  try {
    const types = DESTINATION_TYPE_MAPPING[destinationType] || ['point_of_interest'];
    const locationStr = `${location.latitude},${location.longitude}`;

    // Try each type until we find a result
    for (const type of types) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${locationStr}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const place = data.results[0]; // Get the closest result

        return {
          success: true,
          poi: {
            name: place.name,
            address: place.vicinity || place.formatted_address || '',
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            placeId: place.place_id,
            types: place.types,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            isOpenNow: place.opening_hours?.open_now,
            priceLevel: place.price_level,
            vicinity: place.vicinity,
          },
        };
      }
    }

    // No results found for any type
    return {
      success: false,
      error: 'No matching POI found nearby',
    };
  } catch (error) {
    console.error('Error searching for POI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for a POI in a specific direction from origin
 * This helps ensure the POI is roughly in the direction the user should walk
 */
export async function findPOIInDirection(
  origin: { latitude: number; longitude: number },
  bearing: number,
  distance: number,
  destinationType: DestinationType
): Promise<POIResult> {
  // Project a point in the target direction
  const R = 6371000; // Earth's radius in meters
  const angularDistance = distance / R;

  const lat1 = (origin.latitude * Math.PI) / 180;
  const lon1 = (origin.longitude * Math.PI) / 180;
  const bearingRad = (bearing * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  const targetLocation = {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  };

  // Search for POI near the projected target location
  // Use a smaller radius since we're targeting a specific area
  return findNearestPOI(targetLocation, destinationType, 1000);
}

/**
 * ENHANCED: Execute 6-tier parallel searches with Dynamic Quest Rotation
 * Features:
 * - Larger POI pools (20-30 results per tier) with random shuffling
 * - Directional bias (bearing-based filtering)
 * - History-aware filtering (blacklist support)
 * - Daily theme weighting
 *
 * Tier Structure:
 * - Chill: 500m-1km (20-30 results, select 2)
 * - Discovery: 1.5km-3km (20-30 results, select 2)
 * - Workout: 4km-6km (20-30 results, select 2)
 */
export async function searchMultiTierPOIs(
  location: { latitude: number; longitude: number },
  minRating: number = 4.0,
  options?: {
    /** Preferred bearing direction (0-360) for directional bias */
    bearingBias?: number;
    /** Place IDs to exclude (history blacklist) */
    blacklistedPlaceIds?: string[];
    /** Daily theme category weights */
    categoryWeights?: Record<string, number>;
  }
): Promise<{
  success: boolean;
  tierResults: {
    chill: POI[];
    discovery: POI[];
    workout: POI[];
  };
  varietyScore: number;
  error?: string;
}> {
  console.log('🎯 DYNAMIC QUEST ROTATION ENGINE - Starting enhanced search...');
  console.log(`  Location: (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`);
  console.log(`  Min Rating: ${minRating}`);

  if (options?.bearingBias !== undefined) {
    console.log(`  🧭 Directional Bias: ${options.bearingBias}° (${getCardinalName(options.bearingBias)})`);
  }

  if (options?.blacklistedPlaceIds && options.blacklistedPlaceIds.length > 0) {
    console.log(`  🚫 Blacklist: ${options.blacklistedPlaceIds.length} places filtered`);
  }

  try {
    // Define destination types to search for with daily theme weights
    const destinationTypes: DestinationType[] = ['cafe', 'park', 'restaurant', 'bakery', 'shop'];

    // ENHANCED: Fetch LARGER pools (20-30 results per tier)
    const searchPromises = [
      // Chill Tier (500m - 1km): Fetch up to 20 results
      findHighQualityPOIs(location, destinationTypes[0], 750, minRating, 20),
      findHighQualityPOIs(location, destinationTypes[1], 1000, minRating, 20),

      // Discovery Tier (1.5km - 3km): Fetch up to 25 results
      findHighQualityPOIs(location, destinationTypes[2], 2000, minRating, 25),
      findHighQualityPOIs(location, destinationTypes[3], 2500, minRating, 25),

      // Workout Tier (4km - 6km): Fetch up to 30 results
      findHighQualityPOIs(location, destinationTypes[4], 5000, minRating, 30),
      findHighQualityPOIs(location, 'landmark', 6000, minRating, 30),
    ];

    const results = await Promise.all(searchPromises);

    // Collect ALL results by tier (larger pools)
    let chillPOIs = [...results[0].pois, ...results[1].pois];
    let discoveryPOIs = [...results[2].pois, ...results[3].pois];
    let workoutPOIs = [...results[4].pois, ...results[5].pois];

    console.log('📊 Raw pool sizes:');
    console.log(`  Chill: ${chillPOIs.length} POIs`);
    console.log(`  Discovery: ${discoveryPOIs.length} POIs`);
    console.log(`  Workout: ${workoutPOIs.length} POIs`);

    // FILTER: Apply blacklist (history-aware filtering)
    if (options?.blacklistedPlaceIds && options.blacklistedPlaceIds.length > 0) {
      const blacklist = new Set(options.blacklistedPlaceIds);

      const chillBefore = chillPOIs.length;
      const discoveryBefore = discoveryPOIs.length;
      const workoutBefore = workoutPOIs.length;

      chillPOIs = chillPOIs.filter(poi => !blacklist.has(poi.placeId));
      discoveryPOIs = discoveryPOIs.filter(poi => !blacklist.has(poi.placeId));
      workoutPOIs = workoutPOIs.filter(poi => !blacklist.has(poi.placeId));

      const chillFiltered = chillBefore - chillPOIs.length;
      const discoveryFiltered = discoveryBefore - discoveryPOIs.length;
      const workoutFiltered = workoutBefore - workoutPOIs.length;

      console.log(`🚫 Blacklist filtering removed:`);
      console.log(`  Chill: ${chillFiltered} duplicates`);
      console.log(`  Discovery: ${discoveryFiltered} duplicates`);
      console.log(`  Workout: ${workoutFiltered} duplicates`);
    }

    // FILTER: Apply directional bias (bearing-based filtering)
    if (options?.bearingBias !== undefined) {
      chillPOIs = filterByBearing(location, chillPOIs, options.bearingBias, 120); // ±60° tolerance
      discoveryPOIs = filterByBearing(location, discoveryPOIs, options.bearingBias, 140); // ±70° tolerance
      workoutPOIs = filterByBearing(location, workoutPOIs, options.bearingBias, 160); // ±80° tolerance

      console.log(`🧭 Directional filtering (${getCardinalName(options.bearingBias)}):`);
      console.log(`  Chill: ${chillPOIs.length} POIs in direction`);
      console.log(`  Discovery: ${discoveryPOIs.length} POIs in direction`);
      console.log(`  Workout: ${workoutPOIs.length} POIs in direction`);
    }

    // SHUFFLE: Randomize order to ensure variety
    chillPOIs = shuffleArray(chillPOIs);
    discoveryPOIs = shuffleArray(discoveryPOIs);
    workoutPOIs = shuffleArray(workoutPOIs);

    // SORT: Apply rating boost (top-rated get priority, but not exclusive)
    chillPOIs = sortWithRandomness(chillPOIs);
    discoveryPOIs = sortWithRandomness(discoveryPOIs);
    workoutPOIs = sortWithRandomness(workoutPOIs);

    // SELECT: Pick 2 from each tier (from the larger shuffled pools)
    const selectedChill = chillPOIs.slice(0, 2);
    const selectedDiscovery = discoveryPOIs.slice(0, 2);
    const selectedWorkout = workoutPOIs.slice(0, 2);

    console.log('✅ Final selection (after rotation & filtering):');
    console.log(`  Chill: ${selectedChill.length} POIs selected`);
    console.log(`  Discovery: ${selectedDiscovery.length} POIs selected`);
    console.log(`  Workout: ${selectedWorkout.length} POIs selected`);

    const totalPOIs = selectedChill.length + selectedDiscovery.length + selectedWorkout.length;

    // Calculate variety score (how many are new)
    const allSelectedIds = [
      ...selectedChill.map(p => p.placeId),
      ...selectedDiscovery.map(p => p.placeId),
      ...selectedWorkout.map(p => p.placeId),
    ];

    const blacklist = options?.blacklistedPlaceIds || [];
    const newPlaces = allSelectedIds.filter(id => !blacklist.includes(id));
    const varietyScore = Math.round((newPlaces.length / Math.max(allSelectedIds.length, 1)) * 100);

    console.log(`🆕 Variety Score: ${varietyScore}% new discoveries`);

    return {
      success: totalPOIs > 0,
      tierResults: {
        chill: selectedChill,
        discovery: selectedDiscovery,
        workout: selectedWorkout,
      },
      varietyScore,
      error: totalPOIs === 0 ? 'No high-quality POIs found in any tier' : undefined,
    };
  } catch (error) {
    console.error('❌ Error in multi-tier POI search:', error);
    return {
      success: false,
      tierResults: {
        chill: [],
        discovery: [],
        workout: [],
      },
      varietyScore: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Calculate bearing from origin to POI
 */
function calculateBearing(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): number {
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lat2 = (destination.latitude * Math.PI) / 180;
  const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Helper: Filter POIs by bearing direction
 */
function filterByBearing(
  origin: { latitude: number; longitude: number },
  pois: POI[],
  targetBearing: number,
  tolerance: number
): POI[] {
  return pois.filter(poi => {
    const bearing = calculateBearing(origin, poi);
    const diff = Math.abs(bearing - targetBearing);
    const normalizedDiff = Math.min(diff, 360 - diff);
    return normalizedDiff <= tolerance / 2;
  });
}

/**
 * Helper: Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Helper: Sort with controlled randomness (rating boost but not deterministic)
 */
function sortWithRandomness(pois: POI[]): POI[] {
  return pois.sort((a, b) => {
    const ratingA = (a.rating || 0) + (Math.random() * 0.5 - 0.25); // Add ±0.25 noise
    const ratingB = (b.rating || 0) + (Math.random() * 0.5 - 0.25);
    return ratingB - ratingA;
  });
}

/**
 * Helper: Get cardinal direction name from bearing
 */
function getCardinalName(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return 'North';
  if (bearing >= 22.5 && bearing < 67.5) return 'Northeast';
  if (bearing >= 67.5 && bearing < 112.5) return 'East';
  if (bearing >= 112.5 && bearing < 157.5) return 'Southeast';
  if (bearing >= 157.5 && bearing < 202.5) return 'South';
  if (bearing >= 202.5 && bearing < 247.5) return 'Southwest';
  if (bearing >= 247.5 && bearing < 292.5) return 'West';
  return 'Northwest';
}

/**
 * Get detailed place information including photos and reviews
 * This can be used for generating the Discovery Story
 */
export async function getPlaceDetails(placeId: string): Promise<{
  success: boolean;
  details?: {
    name: string;
    address: string;
    rating?: number;
    reviewCount?: number;
    photos?: string[];
    website?: string;
    phoneNumber?: string;
  };
  error?: string;
}> {
  if (!GOOGLE_API_KEY) {
    return {
      success: false,
      error: 'API key not configured',
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,photos,website,formatted_phone_number&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return {
        success: false,
        error: data.error_message || data.status,
      };
    }

    const place = data.result;

    // Build photo URLs if available
    const photos = place.photos?.slice(0, 3).map((photo: any) => {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`;
    });

    return {
      success: true,
      details: {
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        photos,
        website: place.website,
        phoneNumber: place.formatted_phone_number,
      },
    };
  } catch (error) {
    console.error('Error fetching place details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
