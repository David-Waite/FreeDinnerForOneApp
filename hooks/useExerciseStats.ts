import { useState, useEffect, useCallback } from "react";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { WorkoutSession, BodyWeightLog } from "../constants/types";

export type ChartDataPoint = { x: string; y: number; label?: string };

export const useExerciseStats = (
  exerciseName: string | null = null,
  userId?: string, // <--- NEW: Optional User ID for remote fetching
) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [weightHistory, setWeightHistory] = useState<BodyWeightLog[]>([]);

  // -- Data States --
  const [volumeData, setVolumeData] = useState<ChartDataPoint[]>([]);
  const [oneRMData, setOneRMData] = useState<ChartDataPoint[]>([]);
  const [maxStrengthData, setMaxStrengthData] = useState<ChartDataPoint[]>([]);
  const [durationData, setDurationData] = useState<ChartDataPoint[]>([]);
  const [consistencyData, setConsistencyData] = useState<ChartDataPoint[]>([]);
  const [bodyWeightData, setBodyWeightData] = useState<ChartDataPoint[]>([]);

  const loadData = useCallback(async () => {
    try {
      let allWorkouts: WorkoutSession[] = [];
      let allWeights: BodyWeightLog[] = [];

      // 1. Determine Source (Local vs Remote)
      if (userId) {
        // Remote (Friend)
        [allWorkouts, allWeights] = await Promise.all([
          WorkoutRepository.getRemoteWorkouts(userId),
          WorkoutRepository.getRemoteBodyWeight(userId),
        ]);
      } else {
        // Local (Me)
        [allWorkouts, allWeights] = await Promise.all([
          WorkoutRepository.getWorkouts(),
          WorkoutRepository.getBodyWeightHistory(),
        ]);
      }

      // 2. Sort & Set Raw Data
      const sortedWorkouts = allWorkouts.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const sortedWeights = allWeights.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      setSessions(sortedWorkouts);
      setWeightHistory(sortedWeights);

      // 3. Process Body Weight Chart
      const weightPoints: ChartDataPoint[] = sortedWeights.map((w) => ({
        x: w.date,
        y: w.weight,
      }));
      setBodyWeightData(weightPoints);

      // 4. Process Workout Stats
      processGlobalStats(sortedWorkouts);

      // 5. Process Specific Exercise Stats (if selected)
      if (exerciseName) {
        processExerciseStats(sortedWorkouts, exerciseName);
      } else {
        // Clear specific stats if no exercise selected
        setVolumeData([]);
        setOneRMData([]);
        setMaxStrengthData([]);
      }
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  }, [exerciseName, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- PROCESSING LOGIC ---

  const processGlobalStats = (data: WorkoutSession[]) => {
    // Duration
    const dur: ChartDataPoint[] = data.map((s) => ({
      x: s.date.split("T")[0],
      y: Math.round(s.duration / 60),
    }));
    setDurationData(dur);

    // Consistency (Weeks)
    const weekMap = new Map<string, number>();
    const now = new Date();
    // Initialize last 12 weeks with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i * 7);
      // Find Monday of that week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      weekMap.set(monday.toISOString().split("T")[0], 0);
    }

    data.forEach((s) => {
      const d = new Date(s.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString().split("T")[0];

      // Only count if it's within our tracked window
      if (weekMap.has(key)) {
        weekMap.set(key, (weekMap.get(key) || 0) + 1);
      }
    });

    const cons: ChartDataPoint[] = Array.from(weekMap.entries())
      .map(([k, v]) => ({ x: k, y: v }))
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    setConsistencyData(cons);
  };

  const processExerciseStats = (data: WorkoutSession[], name: string) => {
    const vol: ChartDataPoint[] = [];
    const est1rm: ChartDataPoint[] = [];
    const actMax: ChartDataPoint[] = [];

    data.forEach((session) => {
      // Handle potentially encrypted/hidden exercises
      if (!session.exercises) return;

      const exercise = session.exercises.find(
        (e) => e.name.toLowerCase() === name.toLowerCase(),
      );

      if (exercise) {
        let sessionVol = 0;
        let sessionBestLift = 0;
        let sessionEst1RM = 0;

        exercise.sets.forEach((set) => {
          if (!set.completed) return;
          const w = parseFloat(set.weight) || 0;
          const r = parseFloat(set.reps) || 0;
          sessionVol += w * r;
          if (w > sessionBestLift) sessionBestLift = w;
          // Epley Formula
          const epley = w * (1 + r / 30);
          if (epley > sessionEst1RM) sessionEst1RM = epley;
        });

        const dateStr = session.date.split("T")[0];
        if (sessionVol > 0) vol.push({ x: dateStr, y: sessionVol });
        if (sessionBestLift > 0)
          actMax.push({ x: dateStr, y: sessionBestLift });
        if (sessionEst1RM > 0)
          est1rm.push({ x: dateStr, y: Math.round(sessionEst1RM) });
      }
    });

    setVolumeData(vol);
    setMaxStrengthData(actMax);
    setOneRMData(est1rm);
  };

  return {
    sessions, // <--- Raw Data (Fixed Error)
    weightHistory, // <--- Raw Data (Fixed Error)
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    bodyWeightData,
    refreshStats: loadData, // <--- Renamed to match stats.tsx
  };
};
