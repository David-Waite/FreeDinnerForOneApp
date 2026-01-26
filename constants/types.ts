export type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
};
export type Exercise = {
  id: string;
  name: string;
  restTime: number; // Seconds
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  date: string;
  duration: number;
  exercises: Exercise[];
};

export type TemplateExercise = {
  id: string;
  name: string;
  targetSets: string;
  targetReps: string;
  restTime: string; // "60"
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
  sessionId?: string | null;
  exerciseName?: string;
};

export type NotesStorage = Record<string, ExerciseNote[]>;

export type PostComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

export type WorkoutPost = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  imageUri?: string;
  date: string;
  comments: PostComment[]; // Update reference here
  likes?: string[];
};
