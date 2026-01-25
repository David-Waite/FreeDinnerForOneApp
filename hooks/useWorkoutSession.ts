import { useState, useEffect } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { Exercise, Set, WorkoutSession } from "../constants/types";
import { useRouter } from "expo-router";

// Enable animation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Helper to parse "60s", "2 min", etc. into seconds
const parseRestTime = (input: string): number => {
  const text = input.toLowerCase();
  const number = parseInt(text.replace(/[^0-9]/g, "")) || 60; // Default 60s
  if (text.includes("m")) return number * 60;
  return number;
};

export function useWorkoutSession(templateId: string) {
  const router = useRouter();
  const [sessionName, setSessionName] = useState("New Session");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [startTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Load Template on mount
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    const template = await WorkoutRepository.getTemplateById(id);
    if (!template) return;

    setSessionName(template.name);

    const sessionExercises: Exercise[] = template.exercises.map((tExercise) => {
      const targetSets = parseInt(tExercise.targetSets) || 3;
      const initialSets: Set[] = Array.from({ length: targetSets }).map(() => ({
        id: Date.now().toString() + Math.random(),
        weight: 0,
        reps: 0,
        completed: false,
      }));

      return {
        id: Date.now().toString() + Math.random(),
        name: tExercise.name,
        restTime: parseRestTime(tExercise.restTime), // Parse it here
        sets: initialSets,
      };
    });

    setExercises(sessionExercises);
    setLoading(false);
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof Set,
    value: number | boolean,
  ) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        return {
          ...e,
          sets: e.sets.map((s) =>
            s.id === setId ? { ...s, [field]: value } : s,
          ),
        };
      }),
    );
  };

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        return {
          ...e,
          sets: e.sets.map((s) =>
            s.id === setId ? { ...s, completed: !s.completed } : s,
          ),
        };
      }),
    );
  };

  const addSet = (exerciseId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        const lastSet = e.sets[e.sets.length - 1];
        const newSet: Set = {
          id: Date.now().toString() + Math.random(),
          weight: lastSet ? lastSet.weight : 0,
          reps: lastSet ? lastSet.reps : 0,
          completed: false,
        };
        return { ...e, sets: [...e.sets, newSet] };
      }),
    );
  };

  const removeSet = (exerciseId: string, setId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        return { ...e, sets: e.sets.filter((s) => s.id !== setId) };
      }),
    );
  };

  const markSetComplete = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        return {
          ...e,
          sets: e.sets.map((s) =>
            s.id === setId ? { ...s, completed: true } : s,
          ),
        };
      }),
    );
  };

  const finishWorkout = async () => {
    const session: WorkoutSession = {
      id: Date.now().toString(),
      name: sessionName,
      date: new Date().toISOString(),
      exercises,
    };
    await WorkoutRepository.saveWorkout(session);
    router.replace("/workouts");
  };

  return {
    markSetComplete,
    sessionName,
    startTime,
    exercises,
    loading,
    updateSet,
    toggleSetComplete,
    addSet,
    removeSet,
    finishWorkout,
  };
}
