/**
 * Google Geocoding API Service
 * Provides reverse geocoding using Google's API for consistent, POI-aware location names
 */

import { LocationContext } from '@/types/mission';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface GeocodingResult {
  success: boolean;
  formattedAddress?: string;
  neighborhood?: string;
  street?: string;
  city?: string;
  region?: string;
  landmark?: string;
  postalCode?: string;
  placeId?: string;
  types?: string[];
  error?: string;
}

/**
 * Reverse geocode coordinates using Google Geocoding API
 * Returns detailed location components for context-aware mission generation
 */
export async function reverseGeocode(
  coords: LocationContext
): Promise<GeocodingResult> {
  console.log('🌍 Using Google Geocoding API for reverse geocoding');
  console.log(`  Coordinates: ${coords.latitude}, ${coords.longitude}`);

  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found');
    return {
      success: false,
      error: 'API key not configured',
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_API_KEY}`;

    console.log('📡 Making Geocoding API request...');

    const response = await fetch(url);
    const data = await response.json();

    console.log('📥 Geocoding API response status:', data.status);

    if (data.status !== 'OK') {
      console.error('❌ Geocoding API error:', data.status);
      if (data.error_message) {
        console.error('   Error message:', data.error_message);
      }
      return {
        success: false,
        error: data.error_message || data.status,
      };
    }

    if (!data.results || data.results.length === 0) {
      console.error('❌ No geocoding results found');
      return {
        success: false,
        error: 'No results found',
      };
    }

    // Get the first (most specific) result
    const result = data.results[0];
    console.log('✅ Geocoding successful');
    console.log(`  Formatted address: ${result.formatted_address}`);
    console.log(`  Place ID: ${result.place_id}`);
    console.log(`  Types: ${result.types?.join(', ')}`);

    // Extract address components
    const components: Record<string, string> = {};
    if (result.address_components) {
      result.address_components.forEach((component: any) => {
        component.types.forEach((type: string) => {
          components[type] = component.long_name;
        });
      });
    }

    // Extract detailed location information
    const geocodingResult: GeocodingResult = {
      success: true,
      formattedAddress: result.formatted_address,
      neighborhood: components.neighborhood || components.sublocality || undefined,
      street: components.route || undefined,
      city: components.locality || components.administrative_area_level_2 || undefined,
      region: components.administrative_area_level_1 || undefined,
      landmark: result.types?.includes('point_of_interest') ? components.establishment : undefined,
      postalCode: components.postal_code || undefined,
      placeId: result.place_id,
      types: result.types,
    };

    console.log('📍 Extracted location components:');
    console.log(`  Neighborhood: ${geocodingResult.neighborhood || 'N/A'}`);
    console.log(`  Street: ${geocodingResult.street || 'N/A'}`);
    console.log(`  City: ${geocodingResult.city || 'N/A'}`);
    console.log(`  Region: ${geocodingResult.region || 'N/A'}`);
    console.log(`  Landmark: ${geocodingResult.landmark || 'N/A'}`);

    return geocodingResult;
  } catch (error) {
    console.error('❌ Exception during geocoding:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a human-readable display name from geocoding results
 * Prioritizes landmarks, then neighborhoods, then streets, then cities
 */
export function getDisplayName(result: GeocodingResult): string {
  if (result.landmark) {
    return result.landmark;
  }

  if (result.neighborhood) {
    return result.city ? `${result.neighborhood}, ${result.city}` : result.neighborhood;
  }

  if (result.street) {
    return result.city ? `${result.street}, ${result.city}` : result.street;
  }

  if (result.city) {
    return result.region ? `${result.city}, ${result.region}` : result.city;
  }

  return result.formattedAddress || 'Unknown Location';
}
