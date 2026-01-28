import { useState, useEffect, useCallback } from "react";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { WorkoutSession } from "../constants/types";

export type ChartDataPoint = { x: string; y: number; label?: string };

export const useExerciseStats = (exerciseName: string | null) => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  // -- Data States --
  const [volumeData, setVolumeData] = useState<ChartDataPoint[]>([]);
  const [oneRMData, setOneRMData] = useState<ChartDataPoint[]>([]); // Estimated
  const [maxStrengthData, setMaxStrengthData] = useState<ChartDataPoint[]>([]); // Actual
  const [durationData, setDurationData] = useState<ChartDataPoint[]>([]);
  const [consistencyData, setConsistencyData] = useState<ChartDataPoint[]>([]);
  const [bodyWeightData, setBodyWeightData] = useState<ChartDataPoint[]>([]); // <--- NEW

  const loadData = useCallback(async () => {
    // 1. Fetch Workouts
    const allWorkouts = await WorkoutRepository.getWorkouts();
    const sorted = allWorkouts.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    setSessions(sorted);

    // 2. Fetch Body Weight
    const weightHistory = await WorkoutRepository.getBodyWeightHistory();
    const weightPoints: ChartDataPoint[] = weightHistory.map((w) => ({
      x: w.date,
      y: w.weight,
    }));
    setBodyWeightData(weightPoints);

    // 3. Process Stats
    processGlobalStats(sorted);
    if (exerciseName) {
      processExerciseStats(sorted, exerciseName);
    }
  }, [exerciseName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 1. Process Global Stats (Duration & Consistency)
  const processGlobalStats = (data: WorkoutSession[]) => {
    // Duration (Minutes)
    const dur: ChartDataPoint[] = data.map((s) => ({
      x: s.date.split("T")[0], // YYYY-MM-DD
      y: Math.round(s.duration / 60), // Seconds to Minutes
    }));
    setDurationData(dur);

    // Consistency (Workouts per Week - Last 12 Weeks)
    const weekMap = new Map<string, number>();
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday =
      now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const currentMonday = new Date(now.setDate(diffToMonday));
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() - i * 7);
      const key = d.toISOString().split("T")[0];
      weekMap.set(key, 0);
    }

    data.forEach((s) => {
      const d = new Date(s.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString().split("T")[0];
      if (weekMap.has(key)) {
        weekMap.set(key, (weekMap.get(key) || 0) + 1);
      }
    });

    const cons: ChartDataPoint[] = Array.from(weekMap.entries()).map(
      ([k, v]) => ({
        x: k,
        y: v,
      }),
    );
    setConsistencyData(cons);
  };

  // 2. Process Specific Exercise Stats
  const processExerciseStats = (data: WorkoutSession[], name: string) => {
    const vol: ChartDataPoint[] = [];
    const est1rm: ChartDataPoint[] = [];
    const actMax: ChartDataPoint[] = [];

    data.forEach((session) => {
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
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    bodyWeightData, // <--- EXPORT
    refresh: loadData,
  };
};
