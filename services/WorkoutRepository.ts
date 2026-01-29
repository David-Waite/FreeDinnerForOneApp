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
  UserProfile,
} from "../constants/types";
import { auth, db, storage } from "../config/firebase"; // Import Firebase Auth & DB
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  collection,
  updateDoc,
  deleteField,
  query,
  where,
} from "firebase/firestore"; // Import Firestore functions
import CryptoJS from "crypto-js"; // Import Crypto
import { getDownloadURL, ref, uploadBytes } from "@firebase/storage";

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

  async getWorkoutById(
    id: string,
    authorId?: string,
  ): Promise<WorkoutSession | undefined> {
    const currentUser = auth.currentUser;
    const isLocal = !authorId || authorId === currentUser?.uid;

    if (isLocal) {
      // 1. LOCAL STRATEGY
      const workouts = await this.getWorkouts();
      return workouts.find((w) => w.id === id);
    } else {
      // 2. REMOTE STRATEGY (Firebase)
      try {
        const docRef = doc(db, "users", authorId, "sessions", id);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();

          // Handle Encryption (Black Box)
          // If the friend's workout is encrypted, we currently CANNOT read the exercises.
          // We return the summary info, but the exercises list might be empty or hidden.
          if (data.isEncrypted) {
            console.log("This workout is encrypted by the user.");
            // Return structure with empty exercises or special flag
            return {
              id: data.id,
              name: data.name,
              date: data.date,
              duration: data.duration,
              exercises: [], // Hidden
              // You might add a custom field like 'isLocked': true here if you extend the type
            } as WorkoutSession;
          }

          return data as WorkoutSession;
        }
        return undefined;
      } catch (e) {
        console.error("Failed to fetch remote workout", e);
        return undefined;
      }
    }
  },

  async saveWorkout(workout: WorkoutSession): Promise<void> {
    const names = workout.exercises.map((e) => e.name);
    await this.ensureExercisesExist(names);

    // 1. Local Save
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

    // 2. Cloud Upload
    await this.uploadSession(workout);
  },

  async uploadSession(workout: WorkoutSession): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const shouldEncrypt =
        userDoc.data()?.privacySettings?.encryptWorkouts ?? false;

      let payload: any = {
        id: workout.id,
        date: workout.date,
        duration: workout.duration,
        name: workout.name,
        isEncrypted: shouldEncrypt,
      };

      if (shouldEncrypt) {
        const jsonString = JSON.stringify(workout.exercises);
        const uniqueKey = `${user.uid}-${APP_SECRET}`;
        payload.data = CryptoJS.AES.encrypt(jsonString, uniqueKey).toString();
      } else {
        payload.exercises = workout.exercises;
      }

      await setDoc(
        doc(db, "users", user.uid, "sessions", workout.id),
        payload,
        { merge: true },
      );
    } catch (error) {
      console.error("Upload session failed", error);
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
      const querySnapshot = await getDocs(collection(db, "posts"));
      const posts: WorkoutPost[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        posts.push(data as WorkoutPost);
      });
      return posts;
    } catch (e) {
      console.error("Failed to load posts", e);
      return [];
    }
  },

  async createPost(post: WorkoutPost): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("User must be logged in");

    try {
      // 1. Fetch User Details for Avatar
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const authorAvatar = userData?.photoURL || user.photoURL || "";
      const authorName = userData?.displayName || user.displayName || "Unknown";

      // 2. Upload Image to Storage
      // Path: posts/{postId}/{filename}
      const response = await fetch(post.imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `posts/${post.id}/image.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);

      // 3. Prepare Firestore Document
      const firestorePost = {
        id: post.id,
        authorId: user.uid,
        authorName: authorName,
        authorAvatar: authorAvatar,
        imageUri: downloadURL, // Use the real cloud URL
        message: post.message,
        createdAt: post.createdAt, // You can use serverTimestamp() here if preferred

        // Workout Summary & Session ID
        workoutSummary: post.workoutSummary || null,
        sessionId: post.sessionId || null,

        // Initialize empty containers
        reactions: {}, // Map as requested
        comments: [],
      };

      // 4. Save to Firestore
      await setDoc(doc(db, "posts", post.id), firestorePost);

      console.log("Post uploaded successfully!");
    } catch (e) {
      console.error("Failed to create post", e);
      throw e; // Re-throw to alert the user in the UI
    }
  },

  async addCommentToPost(
    postId: string,
    text: string,
    parentCommentId?: string,
  ): Promise<PostComment | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const postRef = doc(db, "posts", postId);

    try {
      // 1. Fetch User Details (for the Name)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const userName = userData?.displayName || user.displayName || "Anonymous";

      // 2. Fetch Current Post Data
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return null;

      const postData = postSnap.data() as WorkoutPost;
      const currentComments = postData.comments || [];

      // 3. Create New Comment Object
      const newComment: PostComment = {
        id: Date.now().toString(), // Simple ID
        userId: user.uid,
        userName: userName,
        text: text,
        createdAt: new Date().toISOString(),
        replies: [],
      };

      let updatedComments = [...currentComments];

      // 4. Handle Nesting Logic
      if (parentCommentId) {
        let rootFound = false;

        updatedComments = updatedComments.map((comment) => {
          // A. If replying directly to a Root Comment
          if (comment.id === parentCommentId) {
            rootFound = true;
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
            };
          }

          // B. If replying to a Child Comment (Flatten to Root Parent)
          // We check if the parentId exists inside this comment's replies
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

        // Fallback: If parent not found (deleted?), just add as root
        if (!rootFound) {
          updatedComments.push(newComment);
        }
      } else {
        // No parent = Root Comment
        updatedComments.push(newComment);
      }

      // 5. Update Firestore
      await updateDoc(postRef, {
        comments: updatedComments,
      });

      return newComment;
    } catch (e) {
      console.error("Failed to add comment", e);
      return null;
    }
  },

  async toggleReaction(
    postId: string,
    emoji: string,
  ): Promise<Record<string, string> | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const postRef = doc(db, "posts", postId);

    try {
      // 1. Get current state to see if we are adding or removing
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return null;

      const postData = postSnap.data() as WorkoutPost;
      const currentReactions = postData.reactions || {};
      const currentEmoji = currentReactions[user.uid];

      // 2. Prepare Update
      if (currentEmoji === emoji) {
        // Toggle OFF: Remove the field
        await updateDoc(postRef, {
          [`reactions.${user.uid}`]: deleteField(),
        });

        // Return optimistic update for UI
        delete currentReactions[user.uid];
        return currentReactions;
      } else {
        // Toggle ON (or Switch Emoji): Update the field
        await updateDoc(postRef, {
          [`reactions.${user.uid}`]: emoji,
        });

        // Return optimistic update for UI
        currentReactions[user.uid] = emoji;
        return currentReactions;
      }
    } catch (e) {
      console.error("Failed to toggle reaction", e);
      return null;
    }
  },

  // --- MASTER EXERCISES ---

  normalizeId(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, "_");
  },

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

  async syncGlobalExercises(): Promise<void> {
    try {
      // Fetch from Firestore
      const querySnapshot = await getDocs(collection(db, "global_exercises"));
      const globalExercises: MasterExercise[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.displayName) {
          globalExercises.push({
            id: data.displayName, // We use the name as ID locally for now to match your existing logic
            name: data.displayName,
          });
        }
      });

      if (globalExercises.length === 0) return;

      // Merge with Local (Prioritise Global existence)
      const local = await this.getMasterExercises();
      const localNames = new Set(local.map((e) => e.name.toLowerCase()));

      const merged = [...local];
      globalExercises.forEach((globalEx) => {
        if (!localNames.has(globalEx.name.toLowerCase())) {
          merged.push(globalEx);
          localNames.add(globalEx.name.toLowerCase());
        }
      });

      // Save merged list
      await AsyncStorage.setItem(MASTER_EXERCISE_KEY, JSON.stringify(merged));
      console.log(`Synced ${globalExercises.length} global exercises.`);
    } catch (e) {
      console.error("Failed to sync global exercises", e);
    }
  },

  async ensureExercisesExist(names: string[]): Promise<void> {
    const user = auth.currentUser;
    let shouldShare = false;
    console.log("running");
    // Check Privacy Setting
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        shouldShare =
          userDoc.data()?.privacySettings?.shareExercisesToGlobal ?? false;

        console.log(shouldShare);
      } catch (e) {
        console.warn("Could not check global share setting", e);
      }
    }

    try {
      const existing = await this.getMasterExercises();
      const existingNames = new Set(
        existing.map((e) => e.name.toLowerCase().trim()),
      );

      console.log(existingNames);

      let hasChanges = false;
      const updates = [...existing];
      const newToUpload: string[] = [];

      names.forEach((name) => {
        const cleanName = name.trim();
        // If it's a new exercise we haven't seen before
        if (cleanName && !existingNames.has(cleanName.toLowerCase())) {
          // Add to Local
          updates.push({ id: cleanName, name: cleanName });
          existingNames.add(cleanName.toLowerCase());
          hasChanges = true;

          console.log(`New exercise found: ${cleanName}`);

          // Queue for Upload
          newToUpload.push(cleanName);
        }
      });

      console.log(newToUpload);

      // Save Local
      if (hasChanges) {
        console.log("Saving updated master exercise list locally...");
        await AsyncStorage.setItem(
          MASTER_EXERCISE_KEY,
          JSON.stringify(updates),
        );
      }

      // Upload to Firestore (Only if setting is enabled)
      if (shouldShare && user && newToUpload.length > 0) {
        console.log(
          `Uploading ${newToUpload.length} new exercises to Global...`,
        );
        for (const name of newToUpload) {
          const normalizedId = this.normalizeId(name);
          const docRef = doc(db, "global_exercises", normalizedId);

          await setDoc(
            docRef,
            {
              _id: normalizedId,
              displayName: name,
            },
            { merge: true },
          );
        }
        console.log("Upload Complete.");
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
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Basic mapping
        users.push({
          uid: doc.id,
          displayName: data.displayName || "Unknown",
          photoURL: data.photoURL,
          privacySettings: data.privacySettings,
        });
      });
      return users;
    } catch (e) {
      console.error("Failed to fetch users", e);
      return [];
    }
  },

  // 2. Get Remote Workouts (Friend's Stats)
  async getRemoteWorkouts(userId: string): Promise<WorkoutSession[]> {
    try {
      // Must filter by isEncrypted == false to satisfy Rules
      const q = query(
        collection(db, "users", userId, "sessions"),
        where("isEncrypted", "==", false),
      );

      const snapshot = await getDocs(q);
      const workouts: WorkoutSession[] = [];
      snapshot.forEach((doc) => {
        workouts.push(doc.data() as WorkoutSession);
      });

      // Sort in memory (or add orderBy to query if index exists)
      return workouts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (e) {
      console.error("Failed to fetch remote workouts", e);
      return [];
    }
  },

  // 3. Get Remote Body Weight (Friend's Stats)
  async getRemoteBodyWeight(userId: string): Promise<BodyWeightLog[]> {
    try {
      const q = query(
        collection(db, "users", userId, "weight_logs"),
        where("isEncrypted", "==", false),
      );

      const snapshot = await getDocs(q);
      const logs: BodyWeightLog[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as BodyWeightLog);
      });

      return logs.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    } catch (e) {
      console.error("Failed to fetch remote weight logs", e);
      return [];
    }
  },
};
