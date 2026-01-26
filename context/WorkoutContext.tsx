import React, { createContext, useContext, ReactNode } from "react";
import { useWorkoutSession } from "../hooks/useWorkoutSession";

type WorkoutContextType = ReturnType<typeof useWorkoutSession>;

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const workoutLogic = useWorkoutSession();

  return (
    <WorkoutContext.Provider value={workoutLogic}>
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
