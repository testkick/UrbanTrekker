import { useState, useCallback, useEffect } from 'react';
import { Mission, ActiveMission, MissionState } from '@/types/mission';
import { generateMissions } from '@/services/missionGenerator';

interface UseMissionResult {
  state: MissionState;
  missions: Mission[];
  activeMission: ActiveMission | null;
  error: string | null;
  scanForMissions: () => Promise<void>;
  selectMission: (mission: Mission, currentSteps: number) => void;
  updateMissionProgress: (currentSteps: number) => void;
  completeMission: () => void;
  cancelMission: () => void;
  dismissMissions: () => void;
}

export const useMission = (): UseMissionResult => {
  const [state, setState] = useState<MissionState>('idle');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scan for new missions using AI
  const scanForMissions = useCallback(async () => {
    if (state === 'scanning' || state === 'active') {
      return;
    }

    try {
      setState('scanning');
      setError(null);

      const generatedMissions = await generateMissions();
      setMissions(generatedMissions);
      setState('selecting');
    } catch (err) {
      console.error('Error scanning for missions:', err);
      setError('Failed to generate missions. Please try again.');
      setState('idle');
    }
  }, [state]);

  // Select a mission and start tracking
  const selectMission = useCallback((mission: Mission, currentSteps: number) => {
    const active: ActiveMission = {
      ...mission,
      startedAt: new Date(),
      stepsAtStart: currentSteps,
      currentSteps: currentSteps,
      isCompleted: false,
    };

    setActiveMission(active);
    setMissions([]);
    setState('active');
  }, []);

  // Update mission progress with current step count
  const updateMissionProgress = useCallback((currentSteps: number) => {
    setActiveMission((prev) => {
      if (!prev) return null;

      const stepsInMission = currentSteps - prev.stepsAtStart;
      const isCompleted = stepsInMission >= prev.stepTarget;

      return {
        ...prev,
        currentSteps,
        isCompleted,
      };
    });
  }, []);

  // Complete the current mission
  const completeMission = useCallback(() => {
    if (activeMission) {
      setActiveMission({
        ...activeMission,
        isCompleted: true,
      });
      setState('completed');
    }
  }, [activeMission]);

  // Cancel the current mission
  const cancelMission = useCallback(() => {
    setActiveMission(null);
    setState('idle');
  }, []);

  // Dismiss mission selection without choosing
  const dismissMissions = useCallback(() => {
    setMissions([]);
    setState('idle');
  }, []);

  return {
    state,
    missions,
    activeMission,
    error,
    scanForMissions,
    selectMission,
    updateMissionProgress,
    completeMission,
    cancelMission,
    dismissMissions,
  };
};

export default useMission;
