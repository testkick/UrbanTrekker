/**
 * Mission types for Stepquest
 */

export type MissionVibe = 'chill' | 'discovery' | 'workout';

export interface Mission {
  id: string;
  vibe: MissionVibe;
  title: string;
  description: string;
  stepTarget: number;
  generatedAt: Date;
}

export interface ActiveMission extends Mission {
  startedAt: Date;
  stepsAtStart: number;
  currentSteps: number;
  isCompleted: boolean;
}

export type MissionState = 'idle' | 'scanning' | 'selecting' | 'active' | 'completed';

export interface MissionContextType {
  state: MissionState;
  missions: Mission[];
  activeMission: ActiveMission | null;
  scanForMissions: () => Promise<void>;
  selectMission: (mission: Mission, currentSteps: number) => void;
  updateMissionProgress: (currentSteps: number) => void;
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
