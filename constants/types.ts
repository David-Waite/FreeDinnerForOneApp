export type Set = {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  restTime: number; // Seconds
  sets: Set[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  date: string;
  exercises: Exercise[];
};

export type TemplateExercise = {
  id: string;
  name: string;
  targetSets: string; // CHANGED to string to allow Input editing
  targetReps: string; // CHANGED to string to allow ranges like "8-12"
  restTime: string; // "60s"
  notes: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  lastPerformed?: string;
  exercises: TemplateExercise[];
};

export type ExerciseNote = {
  id: string;
  text: string;
  createdAt: string;
  isPinned: boolean;
};

export type NotesStorage = Record<string, ExerciseNote[]>;

export type WorkoutPost = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  imageUri?: string;
  date: string;
};
