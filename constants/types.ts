export type UserProfile = {
  uid: string;
  displayName: string;
  photoURL?: string;
  privacySettings?: {
    encryptWorkouts: boolean;
    encryptBodyWeight: boolean;
    shareExercisesToGlobal: boolean;
  };
};

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

export type BodyWeightLog = {
  date: string;
  weight: number;
};

// --- UPDATED POST TYPE ---
export type WorkoutPost = {
  id: string;
  authorId: string; // Changed from userId
  authorName: string; // Changed from userName
  authorAvatar?: string; // New
  message: string;
  imageUri: string;
  createdAt: string; // Changed from date

  // We keep these arrays for UI compatibility, but we will convert to Maps for Firestore
  comments: PostComment[];
  reactions: Record<string, string>;

  workoutSummary?: WorkoutSummary;
  sessionId?: string; // New
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
