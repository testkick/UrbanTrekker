/**
 * Google Places API Service
 * Searches for real-world POIs matching mission destination types
 */

import { DestinationType } from '@/types/mission';

// Google API key from environment
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface POIResult {
  success: boolean;
  poi?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId: string;
    types?: string[];
  };
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
