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
];

// 1. Define the Keys
const ENV_SECRET = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || "default-secret";
const FALLBACK_SECRET = "default-secret"; // For legacy dev data

export const SyncService = {
  async wipeLocalData() {
    try {
      await AsyncStorage.multiRemove(KEYS_TO_WIPE);
      console.log("Local data wiped successfully.");
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
  // Tries multiple keys to rescue data
  tryDecrypt(cipherText: string, userId: string): any | null {
    const keysToTry = [
      `${userId}-${ENV_SECRET}`, // 1. Try current env key
      `${userId}-${FALLBACK_SECRET}`, // 2. Try default dev key
    ];

    for (const key of keysToTry) {
      try {
        const bytes = CryptoJS.AES.decrypt(cipherText, key);
        const str = bytes.toString(CryptoJS.enc.Utf8);
        if (str) {
          return JSON.parse(str); // Success!
        }
      } catch (e) {
        // Continue to next key
      }
    }
    return null; // All keys failed
  },

  // --- SYNC FUNCTIONS ---

  async syncSessions(userId: string) {
    const q = query(collection(db, "users", userId, "sessions"));
    const snap = await getDocs(q);
    const sessions: WorkoutSession[] = [];

    snap.forEach((doc) => {
      const data = doc.data();

      if (data.isEncrypted && data.data) {
        // Use helper to try decrypting
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
          console.warn(
            `⚠️ Skipped session ${data.id}: Decryption failed (Key mismatch).`,
          );
          // Optional: Push a "Locked" session so the user knows it exists?
          // sessions.push({ ...data, exercises: [], name: "🔒 Locked Session" } as WorkoutSession);
        }
      } else {
        // Plain text data
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
      // If you ever encrypt templates, use this.tryDecrypt() here too
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
        // Weight is just a number string, not JSON, so handle slightly differently
        // or just wrap it in JSON logic if you stored it as JSON string

        let weightVal = null;

        // Manual Decrypt Loop for simple string
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
