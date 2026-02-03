import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { WorkoutRepository } from "./WorkoutRepository";
import {
  WorkoutSession,
  WorkoutTemplate,
  BodyWeightLog,
} from "../constants/types";
import CryptoJS from "crypto-js";

// Keys to wipe on logout
const KEYS_TO_WIPE = [
  "workout_sessions",
  "workout_templates",
  "body_weight_logs",
  "exercise_notes",
  "master_exercises",
  "current_workout_session", // <--- ADDED: Wipes the active workout JSON
  "workout_timer_start", // <--- ADDED: Wipes the session stopwatch
];

// 1. Define the Keys
const ENV_SECRET = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || "default-secret";
const FALLBACK_SECRET = "default-secret"; // For legacy dev data

export const SyncService = {
  async wipeLocalData() {
    console.log("🧹 Wiping local data...");
    try {
      await AsyncStorage.multiRemove(KEYS_TO_WIPE);
      console.log("✨ Local data wiped successfully.");
    } catch (e) {
      console.error("Failed to wipe local data", e);
    }
  },

  async hydrateData(userId: string) {
    console.log("Starting Data Hydration...");
    try {
      await Promise.all([
        this.syncSessions(userId),
        this.syncTemplates(userId),
        this.syncWeightLogs(userId),
      ]);
      console.log("Hydration Complete!");
    } catch (e) {
      console.error("Hydration failed", e);
    }
  },

  // --- INTERNAL HELPER: Safe Decrypt ---
  tryDecrypt(cipherText: string, userId: string): any | null {
    const keysToTry = [
      `${userId}-${ENV_SECRET}`,
      `${userId}-${FALLBACK_SECRET}`,
    ];

    for (const key of keysToTry) {
      try {
        const bytes = CryptoJS.AES.decrypt(cipherText, key);
        const str = bytes.toString(CryptoJS.enc.Utf8);
        if (str) {
          return JSON.parse(str);
        }
      } catch (e) {
        // Continue
      }
    }
    return null;
  },

  // --- SYNC FUNCTIONS ---
  async syncSessions(userId: string) {
    const q = query(collection(db, "users", userId, "sessions"));
    const snap = await getDocs(q);
    const sessions: WorkoutSession[] = [];

    snap.forEach((doc) => {
      const data = doc.data();

      if (data.isEncrypted && data.data) {
        const decryptedExercises = this.tryDecrypt(data.data, userId);

        if (decryptedExercises) {
          sessions.push({
            id: data.id,
            name: data.name,
            date: data.date,
            duration: data.duration,
            exercises: decryptedExercises,
          });
        } else {
          console.warn(`⚠️ Skipped session ${data.id}: Decryption failed.`);
        }
      } else {
        sessions.push(data as WorkoutSession);
      }
    });

    if (sessions.length > 0) {
      await WorkoutRepository.overrideLocalSessions(sessions);
    }
  },

  async syncTemplates(userId: string) {
    const q = query(collection(db, "users", userId, "routines"));
    const snap = await getDocs(q);
    const templates: WorkoutTemplate[] = [];

    snap.forEach((doc) => {
      templates.push(doc.data() as WorkoutTemplate);
    });

    if (templates.length > 0) {
      await WorkoutRepository.overrideLocalTemplates(templates);
    }
  },

  async syncWeightLogs(userId: string) {
    const q = query(collection(db, "users", userId, "weight_logs"));
    const snap = await getDocs(q);
    const logs: BodyWeightLog[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      if (data.isEncrypted && data.data) {
        let weightVal = null;
        const keysToTry = [
          `${userId}-${ENV_SECRET}`,
          `${userId}-${FALLBACK_SECRET}`,
        ];
        for (const key of keysToTry) {
          try {
            const bytes = CryptoJS.AES.decrypt(data.data, key);
            const str = bytes.toString(CryptoJS.enc.Utf8);
            if (str) {
              weightVal = parseFloat(str);
              break;
            }
          } catch (e) {}
        }

        if (weightVal !== null) {
          logs.push({ date: data.date, weight: weightVal });
        }
      } else {
        logs.push({ date: data.date, weight: data.weight });
      }
    });

    if (logs.length > 0) {
      await WorkoutRepository.overrideLocalWeightLogs(logs);
    }
  },
};
