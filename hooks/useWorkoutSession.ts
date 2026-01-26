import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WorkoutSession, WorkoutSet, Exercise } from "../constants/types";
import { WorkoutRepository } from "../services/WorkoutRepository";

const CURRENT_SESSION_KEY = "current_workout_session";
const TIMER_START_KEY = "workout_timer_start";

export const useWorkoutSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadActiveSession();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !isPaused && sessionId) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, isPaused, sessionId]);

  const loadActiveSession = async () => {
    try {
      const json = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
      const timerStart = await AsyncStorage.getItem(TIMER_START_KEY);

      if (json) {
        const session: WorkoutSession = JSON.parse(json);
        setSessionId(session.id);
        setSessionName(session.name);
        setExercises(session.exercises);

        if (timerStart) {
          const start = parseInt(timerStart, 10);
          setStartTime(start);
          setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
        }
      }
    } catch (e) {
      console.error("Failed to load active session", e);
    }
  };

  const startWorkout = async (templateId?: string) => {
    let newExercises: Exercise[] = [];
    let name = "Quick Workout";

    if (templateId) {
      const template = await WorkoutRepository.getTemplateById(templateId);
      if (template) {
        name = template.name;
        newExercises = template.exercises.map((ex) => ({
          id: ex.id,
          name: ex.name,
          restTime: parseInt(ex.restTime) || 60,
          sets: ex.targetSets
            ? Array(parseInt(ex.targetSets) || 3)
                .fill(null)
                .map((_, i) => ({
                  id: Date.now().toString() + i,
                  weight: "",
                  reps: "",
                  completed: false,
                }))
            : [],
        }));
      }
    }

    const newId = Date.now().toString();
    const start = Date.now();

    setSessionId(newId);
    setSessionName(name);
    setExercises(newExercises);
    setStartTime(start);
    setElapsedSeconds(0);
    setIsPaused(false);

    const session: WorkoutSession = {
      id: newId,
      name,
      date: new Date().toISOString(),
      duration: 0,
      exercises: newExercises,
    };

    await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    await AsyncStorage.setItem(TIMER_START_KEY, start.toString());
  };

  const saveSessionState = async (updatedExercises: Exercise[]) => {
    if (!sessionId) return;
    const currentSession: WorkoutSession = {
      id: sessionId,
      name: sessionName,
      date: new Date().toISOString(),
      duration: elapsedSeconds,
      exercises: updatedExercises,
    };
    await AsyncStorage.setItem(
      CURRENT_SESSION_KEY,
      JSON.stringify(currentSession),
    );
  };

  const updateSet = (
    exId: string,
    setId: string,
    field: keyof WorkoutSet,
    value: string | number | boolean,
  ) => {
    const updated = exercises.map((e) => {
      if (e.id !== exId) return e;
      return {
        ...e,
        sets: e.sets.map((s) => {
          if (s.id !== setId) return s;
          if (
            (field === "weight" || field === "reps") &&
            typeof value === "number"
          ) {
            return { ...s, [field]: value.toString() };
          }
          return { ...s, [field]: value };
        }),
      };
    });
    setExercises(updated);
    saveSessionState(updated);
  };

  const markSetComplete = (exId: string, setId: string) => {
    const updated = exercises.map((e) => {
      if (e.id !== exId) return e;
      return {
        ...e,
        sets: e.sets.map((s) =>
          s.id === setId ? { ...s, completed: !s.completed } : s,
        ),
      };
    });
    setExercises(updated);
    saveSessionState(updated);
  };

  const addSet = (exId: string) => {
    const updated = exercises.map((e) => {
      if (e.id !== exId) return e;
      const previousSet = e.sets[e.sets.length - 1];
      const newSet: WorkoutSet = {
        id: Date.now().toString(),
        reps: previousSet ? previousSet.reps : "",
        weight: previousSet ? previousSet.weight : "",
        completed: false,
      };
      return { ...e, sets: [...e.sets, newSet] };
    });
    setExercises(updated);
    saveSessionState(updated);
  };

  const removeSet = (exId: string, setId: string) => {
    const updated = exercises.map((e) => {
      if (e.id !== exId) return e;
      return { ...e, sets: e.sets.filter((s) => s.id !== setId) };
    });
    setExercises(updated);
    saveSessionState(updated);
  };

  const togglePause = () => setIsPaused(!isPaused);

  const saveSession = async () => {
    if (!sessionId) return;
    const finalSession: WorkoutSession = {
      id: sessionId,
      name: sessionName,
      date: new Date().toISOString(),
      duration: elapsedSeconds,
      exercises,
    };

    await WorkoutRepository.saveWorkout(finalSession);
    await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    await AsyncStorage.removeItem(TIMER_START_KEY);

    // Force reset state
    setSessionId(null);
    setExercises([]);
    setStartTime(null);
    setElapsedSeconds(0);
  };

  const cancelSession = async () => {
    await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    await AsyncStorage.removeItem(TIMER_START_KEY);
    setSessionId(null);
    setExercises([]);
    setStartTime(null);
    setElapsedSeconds(0);
  };

  return {
    isActive: !!sessionId,
    sessionId,
    sessionName,
    exercises,
    elapsedSeconds,
    isPaused,
    startWorkout,
    togglePause,
    updateSet,
    markSetComplete,
    addSet,
    removeSet,
    saveSession,
    cancelSession,
    hasUnsavedChanges: elapsedSeconds > 0,
    hasIncompleteData: exercises.some((e) =>
      e.sets.some((s) => !s.completed && (s.weight === "" || s.reps === "")),
    ),
  };
};
