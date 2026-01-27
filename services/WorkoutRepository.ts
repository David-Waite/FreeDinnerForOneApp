import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseNote,
  NotesStorage,
  WorkoutPost,
  WorkoutSession,
  WorkoutTemplate,
  PostComment,
  PostReaction,
  MasterExercise,
} from "../constants/types";

const SESSION_KEY = "workout_sessions";
const TEMPLATE_KEY = "workout_templates";
const NOTES_KEY = "exercise_notes";
const POSTS_KEY = "workout_posts";
const MASTER_EXERCISE_KEY = "master_exercises";

export const WorkoutRepository = {
  // --- SESSIONS (History) ---

  async getWorkouts(): Promise<WorkoutSession[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(SESSION_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error("Failed to load sessions", e);
      return [];
    }
  },

  async getWorkoutById(id: string): Promise<WorkoutSession | undefined> {
    const workouts = await this.getWorkouts();
    return workouts.find((w) => w.id === id);
  },

  async saveWorkout(workout: WorkoutSession): Promise<void> {
    // 1. Harvest Names
    const names = workout.exercises.map((e) => e.name);
    await this.ensureExercisesExist(names);

    // 2. Save Session
    const existing = await this.getWorkouts();
    const index = existing.findIndex((w) => w.id === workout.id);
    let updated;
    if (index >= 0) {
      updated = [...existing];
      updated[index] = workout;
    } else {
      updated = [workout, ...existing];
    }
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  },

  async deleteWorkout(id: string): Promise<void> {
    try {
      const existingSessions = await this.getWorkouts();
      const filteredSessions = existingSessions.filter((w) => w.id !== id);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filteredSessions));
    } catch (e) {
      console.error("Failed to delete workout", e);
    }
  },

  // --- HISTORY LOOKUP (New & Existing) ---

  // NEW: Helper to find specific set data from history for auto-fill
  async getHistoricSetValues(
    exerciseName: string,
    setIndex: number,
  ): Promise<{ weight: string; reps: string } | null> {
    try {
      // 1. Get the last 2 sessions that included this exercise
      const recentSessions = await this.getRecentHistoryForExercise(
        exerciseName,
        2,
      );

      // 2. Iterate through them (newest first) to find a matching set index
      for (const session of recentSessions) {
        const exercise = session.exercises.find(
          (e) => e.name.toLowerCase() === exerciseName.toLowerCase(),
        );

        if (exercise && exercise.sets[setIndex]) {
          const set = exercise.sets[setIndex];
          // Only return if there is actual data
          if (set.weight || set.reps) {
            return { weight: set.weight, reps: set.reps };
          }
        }
      }
      return null;
    } catch (e) {
      console.error("Failed to get historic set values", e);
      return null;
    }
  },

  async getRecentHistoryForExercise(
    exerciseName: string,
    limit: number = 3,
  ): Promise<WorkoutSession[]> {
    try {
      const allSessions = await this.getWorkouts();
      // Sort newest first
      const sorted = allSessions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      // Filter sessions that contain this exercise
      const filtered = sorted.filter((session) =>
        session.exercises.some(
          (e) => e.name.toLowerCase() === exerciseName.toLowerCase(),
        ),
      );

      return filtered.slice(0, limit);
    } catch (e) {
      return [];
    }
  },

  // --- TEMPLATES (Plans) ---

  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(TEMPLATE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      return [];
    }
  },

  async getTemplateById(id: string): Promise<WorkoutTemplate | undefined> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id);
  },

  async saveTemplate(template: WorkoutTemplate): Promise<void> {
    try {
      // 1. Harvest Names
      const names = template.exercises.map((e) => e.name);
      await this.ensureExercisesExist(names);

      // 2. Save Template
      const existing = await this.getTemplates();
      const index = existing.findIndex((t) => t.id === template.id);
      let updated;
      if (index >= 0) {
        updated = [...existing];
        updated[index] = template;
      } else {
        updated = [template, ...existing];
      }
      await AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save template", e);
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.getTemplates();
    const filtered = existing.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(filtered));
  },

  // --- NOTES ---

  async getNotes(exerciseName: string): Promise<ExerciseNote[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      const allNotes: NotesStorage =
        jsonValue != null ? JSON.parse(jsonValue) : {};
      const notes = allNotes[exerciseName] || [];
      return notes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    } catch (e) {
      return [];
    }
  },

  async getAllNotes(): Promise<NotesStorage> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : {};
    } catch (e) {
      return {};
    }
  },

  async addNote(
    exerciseName: string,
    text: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      const allNotes: NotesStorage =
        jsonValue != null ? JSON.parse(jsonValue) : {};

      const newNote: ExerciseNote = {
        id: Date.now().toString(),
        text,
        createdAt: new Date().toISOString(),
        isPinned: false,
        sessionId: sessionId || null,
        exerciseName: exerciseName,
      };

      const existing = allNotes[exerciseName] || [];
      allNotes[exerciseName] = [newNote, ...existing];
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
    } catch (e) {
      console.error("Failed to save note", e);
    }
  },

  async togglePinNote(exerciseName: string, noteId: string): Promise<void> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      const allNotes: NotesStorage =
        jsonValue != null ? JSON.parse(jsonValue) : {};
      if (allNotes[exerciseName]) {
        allNotes[exerciseName] = allNotes[exerciseName].map((n) =>
          n.id === noteId ? { ...n, isPinned: !n.isPinned } : n,
        );
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
      }
    } catch (e) {}
  },

  async deleteNote(exerciseName: string, noteId: string): Promise<void> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      const allNotes: NotesStorage =
        jsonValue != null ? JSON.parse(jsonValue) : {};
      if (allNotes[exerciseName]) {
        allNotes[exerciseName] = allNotes[exerciseName].filter(
          (n) => n.id !== noteId,
        );
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
      }
    } catch (e) {}
  },

  // --- POSTS (Social) ---

  async getPosts(): Promise<WorkoutPost[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(POSTS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error("Failed to load posts", e);
      return [];
    }
  },

  async createPost(post: WorkoutPost): Promise<void> {
    try {
      const existing = await this.getPosts();
      const updated = [post, ...existing];
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to create post", e);
    }
  },

  async addCommentToPost(
    postId: string,
    text: string,
  ): Promise<PostComment | null> {
    try {
      const posts = await this.getPosts();
      const postIndex = posts.findIndex((p) => p.id === postId);

      if (postIndex === -1) return null;

      const newComment: PostComment = {
        id: Date.now().toString(),
        userId: "current-user",
        userName: "Me",
        text,
        createdAt: new Date().toISOString(),
      };

      const updatedPost = {
        ...posts[postIndex],
        comments: [...(posts[postIndex].comments || []), newComment],
      };

      posts[postIndex] = updatedPost;

      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      return newComment;
    } catch (e) {
      console.error("Failed to add comment", e);
      return null;
    }
  },

  async toggleReaction(
    postId: string,
    emoji: string,
  ): Promise<PostReaction[] | null> {
    try {
      const posts = await this.getPosts();
      const postIndex = posts.findIndex((p) => p.id === postId);

      if (postIndex === -1) return null;

      const post = posts[postIndex];
      const currentUserId = "current-user"; // Hardcoded for V1
      const existingReactions = post.reactions || [];

      // Check if user already reacted
      const existingReactionIndex = existingReactions.findIndex(
        (r) => r.userId === currentUserId,
      );

      let updatedReactions = [...existingReactions];

      if (existingReactionIndex >= 0) {
        // User has reacted before
        if (existingReactions[existingReactionIndex].emoji === emoji) {
          // Same emoji -> Remove it (Toggle off)
          updatedReactions.splice(existingReactionIndex, 1);
        } else {
          // Different emoji -> Update it
          updatedReactions[existingReactionIndex] = {
            ...updatedReactions[existingReactionIndex],
            emoji: emoji,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        // New reaction
        updatedReactions.push({
          userId: currentUserId,
          emoji: emoji,
          createdAt: new Date().toISOString(),
        });
      }

      // Save
      posts[postIndex] = { ...post, reactions: updatedReactions };
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts));

      return updatedReactions;
    } catch (e) {
      console.error("Failed to toggle reaction", e);
      return null;
    }
  },

  // --- MASTER EXERCISES ---

  async getMasterExercises(): Promise<MasterExercise[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(MASTER_EXERCISE_KEY);
      if (jsonValue == null) {
        return this.seedDefaultExercises();
      }
      return JSON.parse(jsonValue);
    } catch (e) {
      return [];
    }
  },

  async seedDefaultExercises(): Promise<MasterExercise[]> {
    const defaults = [
      "Bench Press",
      "Squat",
      "Deadlift",
      "Overhead Press",
      "Barbell Row",
      "Pull Up",
      "Dumbbell Curl",
      "Tricep Extension",
      "Leg Press",
      "Lat Pulldown",
    ].map((name) => ({ id: name, name }));

    await AsyncStorage.setItem(MASTER_EXERCISE_KEY, JSON.stringify(defaults));
    return defaults;
  },

  // "Harvest" new names from a template or session automatically
  async ensureExercisesExist(names: string[]): Promise<void> {
    try {
      const existing = await this.getMasterExercises();
      const existingNames = new Set(
        existing.map((e) => e.name.toLowerCase().trim()),
      );

      let hasChanges = false;
      const updates = [...existing];

      names.forEach((name) => {
        const cleanName = name.trim();
        if (cleanName && !existingNames.has(cleanName.toLowerCase())) {
          updates.push({ id: cleanName, name: cleanName });
          existingNames.add(cleanName.toLowerCase());
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await AsyncStorage.setItem(
          MASTER_EXERCISE_KEY,
          JSON.stringify(updates),
        );
      }
    } catch (e) {
      console.error("Failed to harvest exercises", e);
    }
  },

  async getPostByWorkoutId(
    workoutId: string,
  ): Promise<WorkoutPost | undefined> {
    try {
      const posts = await this.getPosts();
      // Check if any post has a workoutSummary with the matching ID
      return posts.find((p) => p.workoutSummary?.id === workoutId);
    } catch (e) {
      console.error("Failed to find post by workout ID", e);
      return undefined;
    }
  },
};
