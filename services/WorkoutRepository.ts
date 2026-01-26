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

  // --- POSTS (FIXED) ---
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
};
