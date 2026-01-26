import { useState, useEffect } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { Exercise, Set, WorkoutSession } from "../constants/types";
import { useRouter } from "expo-router";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ... existing parseRestTime helper ...
const parseRestTime = (input: string): number => {
  const text = input.toLowerCase();
  const number = parseInt(text.replace(/[^0-9]/g, "")) || 60;
  if (text.includes("m")) return number * 60;
  return number;
};

export function useWorkoutSession(templateId: string) {
  const router = useRouter();

  // 1. Generate ID immediately so we can link notes to it
  const [sessionId] = useState(Date.now().toString());

  const [sessionName, setSessionName] = useState("New Session");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [startTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

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
        restTime: parseRestTime(tExercise.restTime),
        sets: initialSets,
      };
    });

    setExercises(sessionExercises);
    setLoading(false);
  };

  // ... keep updateSet, toggleSetComplete, addSet, removeSet, markSetComplete EXACTLY THE SAME ...
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

  const finishWorkout = async () => {
    const session: WorkoutSession = {
      id: sessionId, // Use the ID generated at start
      name: sessionName,
      date: new Date().toISOString(),
      exercises,
    };
    await WorkoutRepository.saveWorkout(session);
    router.replace("/workouts");
  };

  return {
    sessionId, // Export this!
    sessionName,
    startTime,
    exercises,
    loading,
    updateSet,
    toggleSetComplete,
    markSetComplete,
    addSet,
    removeSet,
    finishWorkout,
  };
}
