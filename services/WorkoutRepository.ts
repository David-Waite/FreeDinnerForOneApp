import AsyncStorage from "@react-native-async-storage/async-storage";
import { WorkoutSession, WorkoutTemplate } from "../constants/types";

const SESSION_KEY = "workout_sessions";
const TEMPLATE_KEY = "workout_templates";

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
};
