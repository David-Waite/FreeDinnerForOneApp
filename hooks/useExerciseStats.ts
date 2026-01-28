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

    // Normalize "now" to the start of the current week (Monday)
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday
    // Calculate difference to get to Monday (if Sunday, go back 6 days)
    const diffToMonday =
      now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const currentMonday = new Date(now.setDate(diffToMonday));
    currentMonday.setHours(0, 0, 0, 0);

    // Initialize last 12 weeks with 0, using the Monday Date as the Key
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() - i * 7);
      const key = d.toISOString().split("T")[0]; // YYYY-MM-DD format
      weekMap.set(key, 0);
    }

    // Populate map with workout counts
    data.forEach((s) => {
      const d = new Date(s.date);
      // Snap workout date to its Monday
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
        x: k, // Now a valid Date String (e.g., "2023-10-23")
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

  return {
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    refresh: loadData,
  };
};
