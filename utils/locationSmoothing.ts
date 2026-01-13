/**
 * High-Fidelity Location Smoothing System
 * Premium navigation-grade coordinate filtering for smooth, jitter-free tracking
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
}

export interface SmoothedLocation extends Coordinate {
  rawLatitude: number;
  rawLongitude: number;
  isSignificantMovement: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula (meters)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Simplified Kalman Filter for GPS coordinate smoothing
 * Provides optimal estimation by combining predictions with measurements
 */
class KalmanFilter {
  private q: number; // Process noise (how much we trust the model)
  private r: number; // Measurement noise (how much we trust the GPS)
  private x: number; // Estimated value
  private p: number; // Estimation error
  private k: number; // Kalman gain

  constructor(q: number = 0.001, r: number = 0.01, initialValue: number = 0) {
    this.q = q;
    this.r = r;
    this.x = initialValue;
    this.p = 1;
    this.k = 0;
  }

  /**
   * Update the filter with a new measurement
   */
  update(measurement: number, measurementNoise?: number): number {
    // Use accuracy as measurement noise if provided
    const r = measurementNoise !== undefined ? measurementNoise : this.r;

    // Prediction update
    this.p = this.p + this.q;

    // Measurement update
    this.k = this.p / (this.p + r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  /**
   * Get current filtered value
   */
  getValue(): number {
    return this.x;
  }

  /**
   * Reset the filter
   */
  reset(initialValue: number): void {
    this.x = initialValue;
    this.p = 1;
  }
}

/**
 * Location Smoother - High-fidelity coordinate filtering system
 * Combines Kalman filtering, weighted moving average, and threshold-based filtering
 */
export class LocationSmoother {
  private latKalman: KalmanFilter;
  private lonKalman: KalmanFilter;
  private history: Coordinate[] = [];
  private lastSignificantLocation: Coordinate | null = null;
  private readonly maxHistorySize: number;
  private readonly deadZoneRadius: number;
  private readonly movementThreshold: number;

  constructor(options?: {
    maxHistorySize?: number;
    deadZoneRadius?: number;
    movementThreshold?: number;
  }) {
    this.maxHistorySize = options?.maxHistorySize || 5;
    this.deadZoneRadius = options?.deadZoneRadius || 2.5; // meters
    this.movementThreshold = options?.movementThreshold || 1.5; // meters for significant movement
    this.latKalman = new KalmanFilter(0.001, 0.01);
    this.lonKalman = new KalmanFilter(0.001, 0.01);
  }

  /**
   * Apply smoothing to a new location reading
   */
  smooth(newLocation: Coordinate): SmoothedLocation {
    const timestamp = newLocation.timestamp || Date.now();

    // Initialize filters on first reading
    if (this.history.length === 0) {
      this.latKalman.reset(newLocation.latitude);
      this.lonKalman.reset(newLocation.longitude);
      this.lastSignificantLocation = newLocation;
      this.history.push({ ...newLocation, timestamp });
      return {
        ...newLocation,
        rawLatitude: newLocation.latitude,
        rawLongitude: newLocation.longitude,
        isSignificantMovement: true,
      };
    }

    const lastLocation = this.history[this.history.length - 1];

    // Calculate distance from last location
    const distanceFromLast = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Dead-zone filtering: ignore tiny movements (GPS noise when stationary)
    if (distanceFromLast < this.deadZoneRadius) {
      // Return the last smoothed location instead of the jittery new one
      const smoothedLat = this.latKalman.getValue();
      const smoothedLon = this.lonKalman.getValue();

      return {
        latitude: smoothedLat,
        longitude: smoothedLon,
        accuracy: newLocation.accuracy,
        timestamp,
        rawLatitude: newLocation.latitude,
        rawLongitude: newLocation.longitude,
        isSignificantMovement: false,
      };
    }

    // Calculate measurement noise based on GPS accuracy
    // Higher accuracy (lower value) = more trust in the measurement
    const accuracyNoise = newLocation.accuracy
      ? Math.max(0.001, Math.min(newLocation.accuracy / 20, 0.1))
      : 0.01;

    // Apply Kalman filtering for smooth transitions
    const smoothedLat = this.latKalman.update(newLocation.latitude, accuracyNoise);
    const smoothedLon = this.lonKalman.update(newLocation.longitude, accuracyNoise);

    // Add to history
    const smoothedLocation: Coordinate = {
      latitude: smoothedLat,
      longitude: smoothedLon,
      accuracy: newLocation.accuracy,
      timestamp,
    };

    this.history.push(smoothedLocation);

    // Maintain history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Determine if this is significant movement
    const distanceFromSignificant = this.lastSignificantLocation
      ? calculateDistance(
          this.lastSignificantLocation.latitude,
          this.lastSignificantLocation.longitude,
          smoothedLat,
          smoothedLon
        )
      : distanceFromLast;

    const isSignificantMovement = distanceFromSignificant >= this.movementThreshold;

    if (isSignificantMovement) {
      this.lastSignificantLocation = smoothedLocation;
    }

    // Apply weighted moving average for additional smoothing
    const weightedLocation = this.applyWeightedAverage();

    return {
      latitude: weightedLocation.latitude,
      longitude: weightedLocation.longitude,
      accuracy: newLocation.accuracy,
      timestamp,
      rawLatitude: newLocation.latitude,
      rawLongitude: newLocation.longitude,
      isSignificantMovement,
    };
  }

  /**
   * Apply weighted moving average to recent history
   * More recent positions get higher weight
   */
  private applyWeightedAverage(): Coordinate {
    if (this.history.length === 0) {
      return { latitude: 0, longitude: 0 };
    }

    if (this.history.length === 1) {
      return this.history[0];
    }

    // Generate weights: most recent = highest weight
    const weights: number[] = [];
    let totalWeight = 0;

    for (let i = 0; i < this.history.length; i++) {
      // Exponential weighting: newer positions have much more influence
      const weight = Math.pow(2, i);
      weights.push(weight);
      totalWeight += weight;
    }

    // Calculate weighted average
    let weightedLat = 0;
    let weightedLon = 0;

    for (let i = 0; i < this.history.length; i++) {
      const normalizedWeight = weights[i] / totalWeight;
      weightedLat += this.history[i].latitude * normalizedWeight;
      weightedLon += this.history[i].longitude * normalizedWeight;
    }

    return {
      latitude: weightedLat,
      longitude: weightedLon,
    };
  }

  /**
   * Reset the smoother (e.g., when starting a new session)
   */
  reset(): void {
    this.history = [];
    this.lastSignificantLocation = null;
  }

  /**
   * Get current velocity estimate (m/s)
   */
  getVelocity(): number {
    if (this.history.length < 2) return 0;

    const recent = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];

    if (!recent.timestamp || !previous.timestamp) return 0;

    const distance = calculateDistance(
      previous.latitude,
      previous.longitude,
      recent.latitude,
      recent.longitude
    );

    const timeDelta = (recent.timestamp - previous.timestamp) / 1000; // seconds

    return timeDelta > 0 ? distance / timeDelta : 0;
  }
}
