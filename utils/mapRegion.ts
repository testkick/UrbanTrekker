/**
 * Map Region Utilities
 * Calculate optimal map regions to frame multiple coordinates
 */

import { Region } from 'react-native-maps';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calculate a map region that perfectly frames two coordinates
 * Adds padding to ensure both points are visible with spacing
 */
export function calculateRegionForTwoPoints(
  point1: Coordinate,
  point2: Coordinate,
  paddingFactor: number = 1.4
): Region {
  // Calculate center point
  const centerLat = (point1.latitude + point2.latitude) / 2;
  const centerLng = (point1.longitude + point2.longitude) / 2;

  // Calculate deltas (differences)
  const latDelta = Math.abs(point1.latitude - point2.latitude);
  const lngDelta = Math.abs(point1.longitude - point2.longitude);

  // Apply padding to ensure points aren't at the edge
  // Use larger delta to maintain aspect ratio
  const paddedLatDelta = Math.max(latDelta * paddingFactor, 0.005); // Minimum zoom level
  const paddedLngDelta = Math.max(lngDelta * paddingFactor, 0.005);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: paddedLatDelta,
    longitudeDelta: paddedLngDelta,
  };
}

/**
 * Calculate a map region that frames multiple coordinates
 */
export function calculateRegionForPoints(
  points: Coordinate[],
  paddingFactor: number = 1.3
): Region {
  if (points.length === 0) {
    throw new Error('Cannot calculate region for empty points array');
  }

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  // Find bounding box
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  points.forEach((point) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  // Calculate center
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Calculate deltas with padding
  const latDelta = Math.max((maxLat - minLat) * paddingFactor, 0.005);
  const lngDelta = Math.max((maxLng - minLng) * paddingFactor, 0.005);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/**
 * Check if a region is significantly different from another
 * Used to prevent unnecessary map animations
 */
export function isRegionSignificantlyDifferent(
  region1: Region,
  region2: Region,
  threshold: number = 0.0001
): boolean {
  return (
    Math.abs(region1.latitude - region2.latitude) > threshold ||
    Math.abs(region1.longitude - region2.longitude) > threshold ||
    Math.abs(region1.latitudeDelta - region2.latitudeDelta) > threshold * 10 ||
    Math.abs(region1.longitudeDelta - region2.longitudeDelta) > threshold * 10
  );
}
