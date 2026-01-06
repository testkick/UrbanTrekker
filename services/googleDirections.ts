/**
 * Google Directions API Service
 * Fetches street-following walking routes between two points
 */

import Constants from 'expo-constants';
import { RouteCoordinate } from '@/types/mission';

// Try multiple sources for API key: process.env first, then expo-constants extra config
const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

export interface DirectionsResult {
  success: boolean;
  path?: RouteCoordinate[];
  distance?: number; // Distance in meters
  duration?: number; // Duration in seconds
  error?: string;
}

/**
 * Decode Google polyline string into array of coordinates
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const timestamp = Date.now();

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
      timestamp,
    });
  }

  return coordinates;
}

/**
 * Get walking directions from origin to destination using Google Directions API
 * Returns a street-following path with precise turn-by-turn coordinates
 */
export async function getWalkingDirections(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<DirectionsResult> {
  console.log('🔑 Checking API key...');
  console.log(`  API Key present: ${GOOGLE_API_KEY ? 'Yes' : 'No'}`);
  console.log(`  API Key starts with: ${GOOGLE_API_KEY ? GOOGLE_API_KEY.substring(0, 10) + '...' : 'N/A'}`);

  if (!GOOGLE_API_KEY) {
    console.error('❌ Google Maps API key not found in environment');
    console.error('  Expected: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
    return {
      success: false,
      error: 'API key not configured',
    };
  }

  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=walking&key=${GOOGLE_API_KEY}`;

    console.log('📡 Making Directions API request...');
    console.log(`  URL: ${url.replace(GOOGLE_API_KEY, 'API_KEY_HIDDEN')}`);

    const response = await fetch(url);
    const data = await response.json();

    console.log('📥 Directions API response status:', data.status);

    if (data.status !== 'OK') {
      console.error('❌ Directions API error:', data.status);
      if (data.error_message) {
        console.error('   Error message:', data.error_message);
      }
      console.error('   Common causes:');
      console.error('   - REQUEST_DENIED: Directions API not enabled in Google Cloud Console');
      console.error('   - OVER_QUERY_LIMIT: Billing not enabled or quota exceeded');
      console.error('   - INVALID_REQUEST: Invalid coordinates or parameters');
      return {
        success: false,
        error: data.error_message || data.status,
      };
    }

    if (!data.routes || data.routes.length === 0) {
      console.error('❌ No routes found in API response');
      return {
        success: false,
        error: 'No routes found',
      };
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    console.log('📍 Route found:');
    console.log(`  Distance: ${leg.distance?.text} (${leg.distance?.value}m)`);
    console.log(`  Duration: ${leg.duration?.text} (${leg.duration?.value}s)`);

    // Decode the overview polyline for the full route
    const encodedPolyline = route.overview_polyline?.points;
    if (!encodedPolyline) {
      console.error('❌ No polyline data in route');
      return {
        success: false,
        error: 'No polyline data',
      };
    }

    console.log('🔓 Decoding polyline...');
    console.log(`  Encoded polyline length: ${encodedPolyline.length} chars`);

    const path = decodePolyline(encodedPolyline);

    console.log(`✅ Polyline decoded successfully!`);
    console.log(`  Generated ${path.length} coordinate points`);
    console.log(`  First point: (${path[0].latitude}, ${path[0].longitude})`);
    console.log(`  Last point: (${path[path.length - 1].latitude}, ${path[path.length - 1].longitude})`);

    return {
      success: true,
      path,
      distance: leg.distance?.value, // meters
      duration: leg.duration?.value, // seconds
    };
  } catch (error) {
    console.error('❌ Exception fetching walking directions:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if two coordinates are close enough that we don't need to re-fetch directions
 * Threshold: 50 meters
 */
export function shouldRefetchDirections(
  oldOrigin: { latitude: number; longitude: number },
  newOrigin: { latitude: number; longitude: number }
): boolean {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((newOrigin.latitude - oldOrigin.latitude) * Math.PI) / 180;
  const dLon = ((newOrigin.longitude - oldOrigin.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((oldOrigin.latitude * Math.PI) / 180) *
      Math.cos((newOrigin.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Refetch if user has moved more than 50 meters
  return distance > 50;
}
