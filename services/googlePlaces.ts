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
 * Execute 6-tier parallel searches for premium discovery engine
 * Searches across 3 mission tiers (Chill, Discovery, Workout) with 2 searches each
 *
 * Tier Structure:
 * - Chill: 500m-1km (2 searches)
 * - Discovery: 1.5km-3km (2 searches)
 * - Workout: 4km-6km (2 searches)
 */
export async function searchMultiTierPOIs(
  location: { latitude: number; longitude: number },
  minRating: number = 4.0
): Promise<{
  success: boolean;
  tierResults: {
    chill: POI[];
    discovery: POI[];
    workout: POI[];
  };
  error?: string;
}> {
  console.log('🎯 Starting 6-tier parallel POI search...');
  console.log(`  Location: (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`);
  console.log(`  Min Rating: ${minRating}`);

  try {
    // Define destination types to search for
    const destinationTypes: DestinationType[] = ['cafe', 'park', 'restaurant', 'bakery', 'shop'];

    // Execute 6 parallel searches
    const searchPromises = [
      // Chill Tier (500m - 1km): 2 searches
      findHighQualityPOIs(location, destinationTypes[0], 750, minRating, 3),
      findHighQualityPOIs(location, destinationTypes[1], 1000, minRating, 3),

      // Discovery Tier (1.5km - 3km): 2 searches
      findHighQualityPOIs(location, destinationTypes[2], 2000, minRating, 3),
      findHighQualityPOIs(location, destinationTypes[3], 2500, minRating, 3),

      // Workout Tier (4km - 6km): 2 searches
      findHighQualityPOIs(location, destinationTypes[4], 5000, minRating, 3),
      findHighQualityPOIs(location, 'landmark', 6000, minRating, 3),
    ];

    const results = await Promise.all(searchPromises);

    // Collect results by tier
    const chillPOIs = [...results[0].pois, ...results[1].pois];
    const discoveryPOIs = [...results[2].pois, ...results[3].pois];
    const workoutPOIs = [...results[4].pois, ...results[5].pois];

    // Sort each tier by rating
    chillPOIs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    discoveryPOIs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    workoutPOIs.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    console.log('✅ Multi-tier search complete:');
    console.log(`  Chill (500m-1km): ${chillPOIs.length} POIs`);
    console.log(`  Discovery (1.5km-3km): ${discoveryPOIs.length} POIs`);
    console.log(`  Workout (4km-6km): ${workoutPOIs.length} POIs`);

    const totalPOIs = chillPOIs.length + discoveryPOIs.length + workoutPOIs.length;

    return {
      success: totalPOIs > 0,
      tierResults: {
        chill: chillPOIs.slice(0, 2),
        discovery: discoveryPOIs.slice(0, 2),
        workout: workoutPOIs.slice(0, 2),
      },
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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
