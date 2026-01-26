import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseNote,
  NotesStorage,
  WorkoutPost,
  WorkoutSession,
  WorkoutTemplate,
} from "../constants/types";

const SESSION_KEY = "workout_sessions";
const TEMPLATE_KEY = "workout_templates";
const NOTES_KEY = "exercise_notes";
const POSTS_KEY = "workout_posts";

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

  async saveWorkout(workout: WorkoutSession): Promise<void> {
    const existing = await this.getWorkouts();
    const updated = [workout, ...existing];
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  },

  async deleteWorkout(id: string): Promise<void> {
    try {
      // 1. Delete the Session
      const existingSessions = await this.getWorkouts();
      const filteredSessions = existingSessions.filter((w) => w.id !== id);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(filteredSessions));

      // 2. Cascade Delete: Remove notes linked to this session
      const jsonNotes = await AsyncStorage.getItem(NOTES_KEY);
      if (jsonNotes) {
        const allNotes: NotesStorage = JSON.parse(jsonNotes);
        let hasChanges = false;

        // Iterate through every exercise (e.g., "Bench", "Squat")
        Object.keys(allNotes).forEach((exerciseName) => {
          const originalLength = allNotes[exerciseName].length;

          // Filter out notes that belong to the deleted session ID
          allNotes[exerciseName] = allNotes[exerciseName].filter(
            (n) => n.sessionId !== id,
          );

          if (allNotes[exerciseName].length !== originalLength) {
            hasChanges = true;
          }
        });

        // Only write to disk if we actually deleted something
        if (hasChanges) {
          await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
        }
      }
    } catch (e) {
      console.error("Failed to delete workout and notes", e);
    }
  },

  // --- TEMPLATES (Plans) ---
  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(TEMPLATE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error("Failed to load templates", e);
      return [];
    }
  },

  async getTemplateById(id: string): Promise<WorkoutTemplate | undefined> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id);
  },

  async saveTemplate(template: WorkoutTemplate): Promise<void> {
    try {
      const existing = await this.getTemplates();
      const index = existing.findIndex((t) => t.id === template.id);

      let updated;
      if (index >= 0) {
        // Update existing
        updated = [...existing];
        updated[index] = template;
      } else {
        // Create new
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

  async getNotes(exerciseName: string): Promise<ExerciseNote[]> {
    // ... existing implementation
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
      console.error("Failed to load notes", e);
      return [];
    }
  },
  async getAllNotes(): Promise<NotesStorage> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : {};
    } catch (e) {
      console.error("Failed to load all notes", e);
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
        sessionId: sessionId,
        exerciseName: exerciseName, // <--- SAVE THIS
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
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
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
    } catch (e) {
      console.error("Failed to delete note", e);
    }
  },

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
      // Add new post to the TOP of the feed
      const updated = [post, ...existing];
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to create post", e);
    }
  },
};
