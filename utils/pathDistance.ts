/**
 * Path Distance Utilities
 * Calculate distances along polyline paths for street-following routes
 */

import { RouteCoordinate } from '@/types/mission';

/**
 * Calculate distance between two GPS coordinates in meters using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate the total distance along a polyline path
 */
export function calculatePathDistance(path: RouteCoordinate[]): number {
  if (path.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += calculateDistance(
      path[i].latitude,
      path[i].longitude,
      path[i + 1].latitude,
      path[i + 1].longitude
    );
  }

  return totalDistance;
}

/**
 * Find the closest point on a polyline path to a given location
 * Returns the index of the closest segment and the distance to it
 */
export function findClosestPointOnPath(
  location: { latitude: number; longitude: number },
  path: RouteCoordinate[]
): { segmentIndex: number; distanceToSegment: number } {
  if (path.length === 0) {
    return { segmentIndex: 0, distanceToSegment: 0 };
  }

  let closestSegmentIndex = 0;
  let minDistance = Infinity;

  // Check distance to each point in the path
  for (let i = 0; i < path.length; i++) {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      path[i].latitude,
      path[i].longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestSegmentIndex = i;
    }
  }

  return {
    segmentIndex: closestSegmentIndex,
    distanceToSegment: minDistance,
  };
}

/**
 * Calculate the remaining distance along a street path from current location to destination
 * This provides accurate distance along the street route, not straight-line distance
 *
 * Algorithm:
 * 1. Find the closest point on the path to the current location
 * 2. Sum up the distances from that point to the end of the path
 * 3. Add the distance from current location to the closest point
 */
export function calculateRemainingPathDistance(
  currentLocation: { latitude: number; longitude: number },
  streetPath: RouteCoordinate[]
): number {
  if (streetPath.length === 0) return 0;
  if (streetPath.length === 1) {
    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      streetPath[0].latitude,
      streetPath[0].longitude
    );
  }

  // Find the closest point on the path
  const { segmentIndex, distanceToSegment } = findClosestPointOnPath(currentLocation, streetPath);

  // Calculate remaining distance from closest point to end
  let remainingDistance = distanceToSegment;

  // Sum distances from closest point to destination
  for (let i = segmentIndex; i < streetPath.length - 1; i++) {
    remainingDistance += calculateDistance(
      streetPath[i].latitude,
      streetPath[i].longitude,
      streetPath[i + 1].latitude,
      streetPath[i + 1].longitude
    );
  }

  return remainingDistance;
}

/**
 * Check if user has deviated significantly from the path
 * Returns true if user is more than 50m away from the path
 */
export function hasDeviatedFromPath(
  currentLocation: { latitude: number; longitude: number },
  streetPath: RouteCoordinate[],
  threshold: number = 50
): boolean {
  if (streetPath.length === 0) return false;

  const { distanceToSegment } = findClosestPointOnPath(currentLocation, streetPath);
  return distanceToSegment > threshold;
}
