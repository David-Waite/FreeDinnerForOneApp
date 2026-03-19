import { useState, useEffect, useCallback } from "react";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { WorkoutSession, BodyWeightLog } from "../constants/types";
import { auth } from "../config/firebase";

export type ChartDataPoint = {
  x: string;
  y: number;
  label?: string;
  kind?: "workout" | "post";
};

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

      // 4. Fetch post dates + cardio dates for consistency
      const targetId = userId || auth.currentUser?.uid || "";
      const [postDates, cardioSessions] = await Promise.all([
        targetId ? WorkoutRepository.getPostDatesForUser(targetId) : Promise.resolve([]),
        userId
          ? WorkoutRepository.getRemoteCardioSessions(userId)
          : WorkoutRepository.getCardioSessions(),
      ]);
      const cardioDates = cardioSessions.map((s) => s.date.split("T")[0]);

      // 5. Process Workout Stats
      processGlobalStats(sortedWorkouts, postDates, cardioDates);

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

  const processGlobalStats = (data: WorkoutSession[], postDates: string[], cardioDates: string[] = []) => {
    // Duration
    const dur: ChartDataPoint[] = data.map((s) => ({
      x: s.date.split("T")[0],
      y: Math.round(s.duration / 60),
    }));
    setDurationData(dur);

    // Consistency (Days) - one entry per day for the last 90 days
    const dailyWorkoutDates = new Set([
      ...data.map((s) => s.date.split("T")[0]),
      ...cardioDates,
    ]);
    const postDatesSet = new Set(postDates);
    const cons: ChartDataPoint[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      if (dailyWorkoutDates.has(dateStr)) {
        cons.push({ x: dateStr, y: 1, kind: "workout" });
      } else if (postDatesSet.has(dateStr)) {
        cons.push({ x: dateStr, y: 1, kind: "post" });
      } else {
        cons.push({ x: dateStr, y: 0 });
      }
    }

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
          est1rm.push({ x: dateStr, y: Number(sessionEst1RM.toFixed(1)) });
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
