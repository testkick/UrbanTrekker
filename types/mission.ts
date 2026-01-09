/**
 * Mission types for Stepquest
 */

/**
 * Location context for mission generation and geocoding
 */
export interface LocationContext {
  latitude: number;
  longitude: number;
}

export type MissionVibe = 'chill' | 'discovery' | 'workout';

/**
 * Environment types for location-aware mission generation
 */
export type EnvironmentType =
  | 'coastal'
  | 'urban'
  | 'suburban'
  | 'historic'
  | 'park'
  | 'industrial'
  | 'mixed'
  | 'unknown';

/**
 * GPS coordinate with timestamp for route tracking
 */
export interface RouteCoordinate {
  latitude: number;
  longitude: number;
  timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Destination types for POI-based missions
 */
export type DestinationType =
  | 'bakery'
  | 'cafe'
  | 'park'
  | 'landmark'
  | 'restaurant'
  | 'shop'
  | 'gallery'
  | 'viewpoint'
  | 'mystery';

export interface Mission {
  id: string;
  vibe: MissionVibe;
  title: string;
  description: string;
  stepTarget: number;
  generatedAt: Date;
  /** Target bearing in degrees from north (0-360) for waypoint guidance */
  targetBearing: number;
  /** Environment type detected at mission generation */
  environmentType: EnvironmentType;
  /** Type of destination for POI snapping and icon display */
  destinationType: DestinationType;
  /** AI-generated narrative hook explaining why this destination is special */
  destinationNarrative: string;
  /** Optional destination archetype (e.g., "A Secret Garden", "Local Sourdough Sanctuary") */
  destinationArchetype?: string;
  /** Real POI data from Google Places (for High-Quality Discovery Engine) */
  realPOI?: {
    name: string;
    address: string;
    rating: number;
    userRatingsTotal: number;
    isOpenNow: boolean;
    latitude: number;
    longitude: number;
    placeId: string;
  };
}

export interface ActiveMission extends Mission {
  startedAt: Date;
  stepsAtStart: number;
  currentSteps: number;
  isCompleted: boolean;
  rewardText?: string;
  isGeneratingReward?: boolean;
  /** Array of GPS coordinates recorded during the mission */
  routeCoordinates: RouteCoordinate[];
  /** Projected goal coordinate based on bearing and step target */
  goalCoordinate: RouteCoordinate;
  /** Distance in meters from current location to goal */
  distanceToGoal: number;
  /** How the mission was completed (steps reached or proximity to goal) */
  completionType?: 'steps' | 'proximity';
  /** Street-following path from Google Directions API */
  streetPath?: RouteCoordinate[];
  /** POI name if snapped to actual location */
  poiName?: string;
  /** POI address if available */
  poiAddress?: string;
  /** Flag indicating user has arrived at destination (within 20m) */
  hasArrived?: boolean;
  /** AI-generated "Local Review" story for Discovery Card */
  discoveryStory?: string;
}

export interface CompletedMission {
  id: string;
  title: string;
  description: string;
  vibe: MissionVibe;
  stepTarget: number;
  stepsCompleted: number;
  rewardText: string;
  completedAt: string;
  durationMinutes: number;
  /** Array of GPS coordinates from the mission route */
  routeCoordinates?: RouteCoordinate[];
}

export type MissionState = 'idle' | 'scanning' | 'selecting' | 'active' | 'completed';

export interface MissionContextType {
  state: MissionState;
  missions: Mission[];
  activeMission: ActiveMission | null;
  scanForMissions: () => Promise<void>;
  selectMission: (mission: Mission, currentSteps: number) => void;
  updateMissionProgress: (currentSteps: number) => void;
  /** Add a GPS coordinate to the active mission's route */
  addRoutePoint: (latitude: number, longitude: number) => void;
  completeMission: () => void;
  cancelMission: () => void;
  dismissMissions: () => void;
  error: string | null;
}

// Vibe configurations for UI display
export const VIBE_CONFIG: Record<MissionVibe, {
  icon: string;
  color: string;
  label: string;
  emoji: string;
}> = {
  chill: {
    icon: 'leaf',
    color: '#4CAF50',
    label: 'Chill',
    emoji: '🌿',
  },
  discovery: {
    icon: 'compass',
    color: '#2196F3',
    label: 'Discovery',
    emoji: '🧭',
  },
  workout: {
    icon: 'flame',
    color: '#FF5722',
    label: 'Challenge',
    emoji: '🔥',
  },
};
