/**
 * Mission types for Stepquest
 */

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
