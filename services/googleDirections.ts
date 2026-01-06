/**
 * Google Directions API Service
 * Fetches street-following walking routes between two points
 */

import { RouteCoordinate } from '@/types/mission';

// Google API key from environment
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
  if (!GOOGLE_API_KEY) {
    console.error('Google Maps API key not found');
    return {
      success: false,
      error: 'API key not configured',
    };
  }

  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destinationStr = `${destination.latitude},${destination.longitude}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=walking&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn('Directions API error:', data.status, data.error_message);
      return {
        success: false,
        error: data.error_message || data.status,
      };
    }

    if (!data.routes || data.routes.length === 0) {
      return {
        success: false,
        error: 'No routes found',
      };
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Decode the overview polyline for the full route
    const encodedPolyline = route.overview_polyline?.points;
    if (!encodedPolyline) {
      return {
        success: false,
        error: 'No polyline data',
      };
    }

    const path = decodePolyline(encodedPolyline);

    return {
      success: true,
      path,
      distance: leg.distance?.value, // meters
      duration: leg.duration?.value, // seconds
    };
  } catch (error) {
    console.error('Error fetching walking directions:', error);
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
