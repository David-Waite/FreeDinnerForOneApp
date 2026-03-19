export type UserProfile = {
  uid: string;
  displayName: string;
  photoURL?: string;
  isAdmin?: boolean;
  isCompActive?: boolean;
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
  sessionType?: "hypertrophy";
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
  isPublic: boolean;
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

// --- NEW REACTION TYPE ---
export type ReactionDetail = {
  userId: string;
  emoji: string;
  userAvatar?: string;
  userName?: string;
};

// --- UPDATED POST TYPE ---
export type WorkoutPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  message: string;
  imageUri: string;
  createdAt: string;
  isBacklog?: boolean; // <-- Add this line

  comments: PostComment[];
  reactions: Record<string, string>;
  reactionData?: Record<string, ReactionDetail>;
  workoutSummary?: WorkoutSummary;
  cardioSummary?: CardioSummary;
  sessionId?: string;
};

export type PostComment = {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
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

// --- CARDIO TYPES ---
export type CardioActivityType = "run" | "walk" | "cycle";

export type CardioSession = {
  id: string;
  sessionType: "cardio";
  activityType: CardioActivityType;
  date: string;       // ISO timestamp
  duration: number;   // seconds
  distance: number;   // kilometres
  pace: number;       // seconds per km
  calories?: number;
  mode: "manual" | "live";
};

export type CardioSummary = {
  id: string;
  activityType: CardioActivityType;
  duration: number;
  distance: number;
  pace: number;
};

export type AnySession = WorkoutSession | CardioSession;
