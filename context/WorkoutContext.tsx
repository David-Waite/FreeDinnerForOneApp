import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useWorkoutSession } from "../hooks/useWorkoutSession";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth"; // <--- Import this
import { SyncService } from "../services/SyncService";

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

type WorkoutContextType = ReturnType<typeof useWorkoutSession> & {
  gameStatus: GameStatus;
  isLoadingGameStatus: boolean;
  refreshGameStatus: () => Promise<void>;
  isHydrating: boolean;
};

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const workoutLogic = useWorkoutSession();

  const [gameStatus, setGameStatus] = useState<GameStatus>(defaultGameStatus);
  const [isLoadingGameStatus, setIsLoadingGameStatus] = useState(true);
  const [isHydrating, setIsHydrating] = useState(true);

  const refreshGameStatus = async () => {
    const user = auth.currentUser;
    if (!user) {
      setGameStatus(defaultGameStatus); // Reset if logged out
      setIsLoadingGameStatus(false);
      return;
    }

    // Keep loading true/false management tight to avoid flicker
    try {
      const status = await WorkoutRepository.getGameStatus(user.uid);
      setGameStatus(status);
    } catch (e) {
      console.error("Failed to refresh game status", e);
    } finally {
      setIsLoadingGameStatus(false);
    }
  };

  // --- CHANGED: Listen to Auth Changes ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User logged in:", user.uid);
        setIsHydrating(true);

        // 1. Hydrate Data (Download Cloud -> Local)
        await SyncService.hydrateData(user.uid);

        // 2. Refresh Game Status
        await refreshGameStatus();

        setIsHydrating(false);
      } else {
        console.log("User logged out. Wiping data.");

        // 1. Wipe Data
        await SyncService.wipeLocalData();

        // 2. Reset State
        setGameStatus(defaultGameStatus);
        setIsLoadingGameStatus(false);
        setIsHydrating(false);
      }
    });
    return unsubscribe;
  }, []);

  const contextValue: WorkoutContextType = {
    ...workoutLogic,
    gameStatus,
    isLoadingGameStatus,
    refreshGameStatus,
    isHydrating,
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
