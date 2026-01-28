// FreeDinnerForOneApp/constants/types.ts

export type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
  previousReps?: string;
};

export type Exercise = {
  id: string;
  name: string;
  restTime: number;
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
  restTime: string;
  notes: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  lastPerformed?: string;
  exercises: TemplateExercise[];
};

export type MasterExercise = {
  id: string;
  name: string;
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

export type WorkoutPost = {
  id: string;
  userId: string;
  userName: string;
  message: string;
  imageUri?: string;
  date: string;
  comments: PostComment[]; // Updated type definition below
  reactions: any[];
  workoutSummary?: {
    id: string;
    name: string;
    duration: number;
    exerciseCount: number;
  };
};

export type PostComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  replies?: PostComment[];
};

export type PostReaction = {
  userId: string;
  emoji: string;
  createdAt: string;
};

export type WorkoutSummary = {
  id: string;
  name: string;
  duration: number;
  exerciseCount: number;
};
