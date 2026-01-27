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

  const loadData = useCallback(async () => {
    const allWorkouts = await WorkoutRepository.getWorkouts();
    // Sort oldest to newest for the graph
    const sorted = allWorkouts.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    setSessions(sorted);
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

    // Initialize last 12 weeks with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i * 7);
      const weekKey = getWeekKey(d);
      weekMap.set(weekKey, 0);
    }

    data.forEach((s) => {
      const d = new Date(s.date);
      const key = getWeekKey(d);
      if (weekMap.has(key)) {
        weekMap.set(key, (weekMap.get(key) || 0) + 1);
      }
    });

    const cons: ChartDataPoint[] = Array.from(weekMap.entries()).map(
      ([k, v]) => ({
        x: k, // "Week 10" or date string
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

          // Volume
          sessionVol += w * r;

          // Actual Max
          if (w > sessionBestLift) sessionBestLift = w;

          // Epley Formula: w * (1 + r/30)
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

  // Helper to get a readable week key
  const getWeekKey = (d: Date) => {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    const weekNum = Math.ceil(
      ((d.getTime() - onejan.getTime()) / millisecsInDay +
        onejan.getDay() +
        1) /
        7,
    );
    return `W${weekNum}`;
  };

  return {
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    refresh: loadData,
  };
};
