import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { AppState } from "react-native";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import { useCardioSession, ActiveCardioSession } from "../hooks/useCardioSession";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { SyncService } from "../services/SyncService";
import { NotificationService } from "../services/NotificationService";
import { CardioActivityType } from "../constants/types";

type GameStatus = {
  score: number;
  cap: number;
  remaining: number;
  canPostToday: boolean;
};

const defaultGameStatus: GameStatus = {
  score: 0,
  cap: 4,
  remaining: 4,
  canPostToday: true,
};

type RestTimerState = {
  endTime: number;
  duration: number;
  exerciseId: string;
  setId: string;
  exerciseName: string;
  isFinished: boolean;
};

type WorkoutContextType = ReturnType<typeof useWorkoutSession> & {
  gameStatus: GameStatus;
  isLoadingGameStatus: boolean;
  refreshGameStatus: () => Promise<void>;
  isHydrating: boolean;

  // Rest Timer
  restTimer: RestTimerState | null;
  isRestTimerMinimized: boolean;
  startRestTimer: (
    duration: number,
    exerciseId: string,
    setId: string,
    exerciseName: string,
  ) => void;
  cancelRestTimer: () => void;
  minimizeRestTimer: () => void;
  maximizeRestTimer: () => void;
  addRestTime: (seconds: number) => void;

  // Cardio Session
  isCardioActive: boolean;
  activeCardio: ActiveCardioSession | null;
  startCardioSession: (activityType: CardioActivityType, gpsEnabled: boolean) => Promise<void>;
  toggleCardioPause: () => void;
  updateCardioDistance: (distance: number) => void;
  endCardioSession: () => Promise<void>;
  abandonCardioSession: () => Promise<void>;

  // UI State
  hideTabBar: boolean;
  setHideTabBar: (v: boolean) => void;
};

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const workoutLogic = useWorkoutSession();
  const { markSetComplete } = workoutLogic;
  const cardioLogic = useCardioSession();

  const [gameStatus, setGameStatus] = useState<GameStatus>(defaultGameStatus);
  const [isLoadingGameStatus, setIsLoadingGameStatus] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);

  // --- REST TIMER STATE ---
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [isRestTimerMinimized, setIsRestTimerMinimized] = useState(false);
  const [hideTabBar, setHideTabBar] = useState(false);

  // Refs for stability
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // NEW: Ref to hold the latest callback logic
  const checkTimerLogicRef = useRef<() => void>(() => {});

  const refreshGameStatus = async () => {
    const user = auth.currentUser;
    if (!user) {
      setGameStatus(defaultGameStatus);
      setIsLoadingGameStatus(false);
      return;
    }
    try {
      const status = await WorkoutRepository.getGameStatus(user.uid);
      setGameStatus(status);
    } catch (e) {
      console.error("Failed to refresh game status", e);
    } finally {
      setIsLoadingGameStatus(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsHydrating(true);
        await SyncService.hydrateData(user.uid);
        await refreshGameStatus();
        setIsHydrating(false);
      } else {
        await SyncService.wipeLocalData();
        setGameStatus(defaultGameStatus);
        setIsLoadingGameStatus(false);
        setIsHydrating(false);
      }
    });
    return unsubscribe;
  }, []);

  // --- REST TIMER ACTIONS ---

  const startRestTimer = useCallback(
    (
      duration: number,
      exerciseId: string,
      setId: string,
      exerciseName: string,
    ) => {
      console.log(
        `[WorkoutContext] START Timer: ${duration}s for ${exerciseName}`,
      );
      const endTime = Date.now() + duration * 1000;

      setRestTimer({
        endTime,
        duration,
        exerciseId,
        setId,
        exerciseName,
        isFinished: false,
      });
      setIsRestTimerMinimized(false);

      NotificationService.cancelAllNotifications();
      NotificationService.scheduleRestTimer(duration);
    },
    [],
  );

  const cancelRestTimer = useCallback(() => {
    console.log("[WorkoutContext] CANCEL Timer");
    setRestTimer(null);
    setIsRestTimerMinimized(false);
    NotificationService.cancelAllNotifications();
  }, []);

  const minimizeRestTimer = useCallback(
    () => setIsRestTimerMinimized(true),
    [],
  );
  const maximizeRestTimer = useCallback(
    () => setIsRestTimerMinimized(false),
    [],
  );

  const addRestTime = useCallback((seconds: number) => {
    setRestTimer((prev) => {
      if (!prev) return null;
      const baseTime = prev.isFinished ? Date.now() : prev.endTime;
      const newEndTime = baseTime + seconds * 1000;
      const remaining = Math.ceil((newEndTime - Date.now()) / 1000);

      NotificationService.cancelAllNotifications();
      NotificationService.scheduleRestTimer(remaining);

      return {
        ...prev,
        endTime: newEndTime,
        isFinished: false,
      };
    });
  }, []);

  // --- TIMER LOGIC (STABILIZED) ---

  // 1. Define the logic (this recreates every render, which is fine)
  const checkTimerStatus = useCallback(() => {
    const now = Date.now();
    setRestTimer((prev) => {
      if (!prev || prev.isFinished) return prev;

      if (now >= prev.endTime) {
        console.log("🚨 [WorkoutContext] TIMER FINISHED! Marking complete.");

        // Mark the set as complete
        markSetComplete(prev.exerciseId, prev.setId);

        NotificationService.cancelAllNotifications();
        return { ...prev, isFinished: true };
      }
      return prev;
    });
  }, [markSetComplete]);

  // 2. Keep the Ref updated with the latest logic
  // This runs every render, ensuring the ref always points to the newest 'checkTimerStatus'
  useEffect(() => {
    checkTimerLogicRef.current = checkTimerStatus;
  }, [checkTimerStatus]);

  // 3. The Interval - NOW STABLE
  // It depends ONLY on whether the timer is running, NOT on the logic function itself.
  useEffect(() => {
    if (restTimer && !restTimer.isFinished) {
      console.log("[WorkoutContext] Interval STARTED (Stable Mode)");

      timerIntervalRef.current = setInterval(() => {
        // ALWAYS call the latest version of the function from the ref
        checkTimerLogicRef.current();
      }, 1000);
    } else {
      // Clear interval if timer doesn't exist or is finished
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [!!restTimer, restTimer?.isFinished]); // Only restart if existence or finished state changes

  // 4. AppState Listener
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log(
          "📱 [WorkoutContext] App woke up. Checking timer immediately...",
        );
        checkTimerLogicRef.current(); // Use the ref here too!
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  const contextValue: WorkoutContextType = {
    ...workoutLogic,
    ...cardioLogic,
    gameStatus,
    isLoadingGameStatus,
    refreshGameStatus,
    isHydrating,
    restTimer,
    isRestTimerMinimized,
    startRestTimer,
    cancelRestTimer,
    minimizeRestTimer,
    maximizeRestTimer,
    addRestTime,
    hideTabBar,
    setHideTabBar,
  };

  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkoutContext = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }
  return context;
};
