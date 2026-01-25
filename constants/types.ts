export type Set = {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  sets: Set[];
};

export type WorkoutSession = {
  id: string;
  name: string; // e.g., "Chest Day"
  date: string; // ISO string
  exercises: Exercise[];
};

export type TemplateExercise = {
  id: string;
  name: string;
  targetSets: string; // e.g. "3" or "4"
  targetReps: string; // e.g. "8-12"
  restTime: string; // e.g. "60s" or "2 min"
  notes: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string; // e.g. "Chest & Triceps"
  lastPerformed?: string; // ISO Date string
  exercises: TemplateExercise[];
};
