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
  BodyWeightLog,
} from "../constants/types";
import { auth, db } from "../config/firebase"; // Import Firebase Auth & DB
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"; // Import Firestore functions
import CryptoJS from "crypto-js"; // Import Crypto

const SESSION_KEY = "workout_sessions";
const TEMPLATE_KEY = "workout_templates";
const NOTES_KEY = "exercise_notes";
const POSTS_KEY = "workout_posts";
const MASTER_EXERCISE_KEY = "master_exercises";
const WEIGHT_KEY = "body_weight_logs";

const APP_SECRET =
  process.env.EXPO_PUBLIC_ENCRYPTION_KEY || "default-secret-key-change-me";

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
    const names = workout.exercises.map((e) => e.name);
    await this.ensureExercisesExist(names);

    // 1. Save Locally (AsyncStorage) - Always plaintext for the user's own device
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

    // 2. Upload to Firebase (The Black Box Logic)
    await this.uploadSession(workout);
  },

  async uploadSession(workout: WorkoutSession): Promise<void> {
    const user = auth.currentUser;
    if (!user) return; // Can't upload if not logged in

    try {
      // 1. Fetch User's Privacy Settings
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const privacySettings = userDoc.data()?.privacySettings || {};
      const shouldEncrypt = privacySettings.encryptWorkouts ?? false;

      // 2. Prepare the Payload
      let payload: any = {
        id: workout.id,
        date: workout.date,
        duration: workout.duration,
        name: workout.name,
        isEncrypted: shouldEncrypt,
      };

      if (shouldEncrypt) {
        //
        // ENCRYPT: Turn the exercises array into a gibberish string
        const jsonString = JSON.stringify(workout.exercises);
        const uniqueKey = `${user.uid}-${APP_SECRET}`; // Unique key per user
        const encryptedData = CryptoJS.AES.encrypt(
          jsonString,
          uniqueKey,
        ).toString();

        payload.data = encryptedData; // The Black Box
        // Note: we do NOT include 'exercises' here
      } else {
        // PLAIN TEXT: Upload full details
        payload.exercises = workout.exercises;
      }

      // 3. Upload to Firestore: users/{uid}/sessions/{sessionId}
      const sessionRef = doc(db, "users", user.uid, "sessions", workout.id);
      await setDoc(sessionRef, payload, { merge: true });

      console.log(`Session uploaded. Encrypted: ${shouldEncrypt}`);
    } catch (error) {
      console.error("Failed to upload session to cloud:", error);
      // We don't throw here to avoid breaking the local save flow
    }
  },

  async deleteWorkout(id: string): Promise<void> {
    try {
      const existingSessions = await this.getWorkouts();
      const filteredSessions = existingSessions.filter((w) => w.id !== id);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filteredSessions));

      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, "users", user.uid, "sessions", id));
      }
    } catch (e) {
      console.error("Failed to delete workout", e);
    }
  },

  // --- BODY WEIGHT TRACKING (NEW) ---

  async getBodyWeightHistory(): Promise<BodyWeightLog[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(WEIGHT_KEY);
      const data: BodyWeightLog[] =
        jsonValue != null ? JSON.parse(jsonValue) : [];
      return data.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    } catch (e) {
      console.error("Failed to load weight history", e);
      return [];
    }
  },

  async saveBodyWeight(weight: number, date: string): Promise<void> {
    try {
      const history = await this.getBodyWeightHistory();
      // Filter out any existing entry for this specific date (Overwrites)
      const filtered = history.filter((log) => log.date !== date);

      const newEntry: BodyWeightLog = { date, weight };
      const updated = [...filtered, newEntry];

      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(updated));

      // NEW: Upload to Cloud
      await this.uploadBodyWeight(newEntry);
    } catch (e) {
      console.error("Failed to save body weight", e);
    }
  },

  async uploadBodyWeight(log: BodyWeightLog): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1. Check Privacy Settings
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const privacySettings = userDoc.data()?.privacySettings || {};

      // Default to TRUE (Safe by default) if setting is missing
      const shouldEncrypt = privacySettings.encryptBodyWeight ?? true;

      // 2. Prepare Payload
      // We use the Date (YYYY-MM-DD) as the ID, so it overwrites correctly
      let payload: any = {
        date: log.date,
        isEncrypted: shouldEncrypt,
      };

      if (shouldEncrypt) {
        // ENCRYPT: Hide the weight value
        // We convert the number to a string, then encrypt it
        const uniqueKey = `${user.uid}-${APP_SECRET}`;
        const encryptedData = CryptoJS.AES.encrypt(
          String(log.weight),
          uniqueKey,
        ).toString();

        payload.data = encryptedData;
      } else {
        // PLAIN TEXT
        payload.weight = log.weight;
      }

      // 3. Save to users/{uid}/weight_logs/{date}
      const logRef = doc(db, "users", user.uid, "weight_logs", log.date);
      await setDoc(logRef, payload, { merge: true });

      console.log(`Weight log uploaded. Encrypted: ${shouldEncrypt}`);
    } catch (error) {
      console.error("Failed to upload weight log:", error);
    }
  },

  // --- HISTORY LOOKUP ---

  async getHistoricSetValues(
    exerciseName: string,
    setIndex: number,
  ): Promise<{ weight: string; reps: string } | null> {
    try {
      const recentSessions = await this.getRecentHistoryForExercise(
        exerciseName,
        2,
      );
      for (const session of recentSessions) {
        const exercise = session.exercises.find(
          (e) => e.name.toLowerCase() === exerciseName.toLowerCase(),
        );
        if (exercise && exercise.sets[setIndex]) {
          const set = exercise.sets[setIndex];
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
      const sorted = allSessions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
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

  // --- TEMPLATES ---

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
      const names = template.exercises.map((e) => e.name);
      await this.ensureExercisesExist(names);

      // 1. Save Locally
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

      // 2. Upload to Firestore (as a Routine)
      await this.uploadRoutine(template);
    } catch (e) {
      console.error("Failed to save template", e);
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      // 1. Delete Local
      const existing = await this.getTemplates();
      const filtered = existing.filter((t) => t.id !== id);
      await AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(filtered));

      // 2. Delete Remote
      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, "users", user.uid, "routines", id));
      }
    } catch (e) {
      console.error("Failed to delete template", e);
    }
  },

  async uploadRoutine(template: WorkoutTemplate): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1. Check Privacy Settings
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const privacySettings = userDoc.data()?.privacySettings || {};

      // Defaults to true if setting is missing, satisfying "encrypted by default"
      const shouldEncrypt = privacySettings.encryptWorkouts ?? true;

      // 2. Prepare Payload
      let payload: any = {
        id: template.id,
        name: template.name,
        lastPerformed: template.lastPerformed || null,
        isEncrypted: shouldEncrypt,
      };

      if (shouldEncrypt) {
        // ENCRYPT: Hide the exercises list
        const jsonString = JSON.stringify(template.exercises);
        const uniqueKey = `${user.uid}-${APP_SECRET}`;
        const encryptedData = CryptoJS.AES.encrypt(
          jsonString,
          uniqueKey,
        ).toString();

        payload.data = encryptedData;
      } else {
        // PLAIN TEXT
        payload.exercises = template.exercises;
      }

      // 3. Save to users/{uid}/routines/{id}
      const routineRef = doc(db, "users", user.uid, "routines", template.id);
      await setDoc(routineRef, payload, { merge: true });

      console.log(`Routine uploaded. Encrypted: ${shouldEncrypt}`);
    } catch (error) {
      console.error("Failed to upload routine:", error);
    }
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

  // --- POSTS ---

  async getPosts(): Promise<WorkoutPost[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(POSTS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
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
    parentCommentId?: string,
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
        replies: [],
      };

      const post = posts[postIndex];
      let updatedComments = [...(post.comments || [])];

      if (parentCommentId) {
        let rootFound = false;
        updatedComments = updatedComments.map((comment) => {
          if (comment.id === parentCommentId) {
            rootFound = true;
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
            };
          }
          const isReplyToChild = comment.replies?.some(
            (r) => r.id === parentCommentId,
          );
          if (isReplyToChild) {
            rootFound = true;
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
            };
          }
          return comment;
        });
        if (!rootFound) updatedComments.push(newComment);
      } else {
        updatedComments.push(newComment);
      }

      posts[postIndex] = { ...post, comments: updatedComments };
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      return newComment;
    } catch (e) {
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
      const currentUserId = "current-user";
      const existingReactions = post.reactions || [];
      const existingReactionIndex = existingReactions.findIndex(
        (r) => r.userId === currentUserId,
      );
      let updatedReactions = [...existingReactions];

      if (existingReactionIndex >= 0) {
        if (existingReactions[existingReactionIndex].emoji === emoji) {
          updatedReactions.splice(existingReactionIndex, 1);
        } else {
          updatedReactions[existingReactionIndex] = {
            ...updatedReactions[existingReactionIndex],
            emoji: emoji,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        updatedReactions.push({
          userId: currentUserId,
          emoji: emoji,
          createdAt: new Date().toISOString(),
        });
      }

      posts[postIndex] = { ...post, reactions: updatedReactions };
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      return updatedReactions;
    } catch (e) {
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
      return posts.find((p) => p.workoutSummary?.id === workoutId);
    } catch (e) {
      return undefined;
    }
  },
};
