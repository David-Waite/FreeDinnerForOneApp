import AsyncStorage from "@react-native-async-storage/async-storage";
import { WorkoutSession, WorkoutSet } from "../constants/types";

// --- HELPERS ---
const uuid = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const createSet = (weight: number, reps: number): WorkoutSet => ({
  id: uuid(),
  weight: Math.floor(weight).toString(),
  reps: Math.floor(reps).toString(),
  completed: true,
});

export const seedDatabase = async () => {
  console.log("🧨 NUKING OLD DATA & Reseeding...");

  // 1. CLEAR EVERYTHING (The Nuclear Option)
  try {
    await AsyncStorage.clear();
    console.log("🧹 Storage Cleared.");
  } catch (e) {
    console.error("Failed to clear", e);
  }

  const sessions: WorkoutSession[] = [];
  const WEEKS_BACK = 24;
  const today = new Date();

  // Stats Curve: Start -> End
  const START_STATS = { bench: 50, squat: 70, deadlift: 90, ohp: 30 };
  const END_STATS = { bench: 85, squat: 120, deadlift: 150, ohp: 55 };

  for (let week = WEEKS_BACK; week >= 0; week--) {
    if (Math.random() < 0.1) continue; // 10% chance to miss a week

    const weekStartMillis = today.getTime() - week * 7 * 24 * 60 * 60 * 1000;
    const progress = 1 - week / WEEKS_BACK;

    // Calculate base weight
    let currentBench =
      START_STATS.bench + (END_STATS.bench - START_STATS.bench) * progress;
    let currentSquat =
      START_STATS.squat + (END_STATS.squat - START_STATS.squat) * progress;
    let currentDead =
      START_STATS.deadlift +
      (END_STATS.deadlift - START_STATS.deadlift) * progress;
    let currentOhp =
      START_STATS.ohp + (END_STATS.ohp - START_STATS.ohp) * progress;

    // 2. APPLY VARIANCE (The "Jagged" Factor)
    // +/- 7.5% random fluctuation
    const variance = 0.925 + Math.random() * 0.15;

    currentBench *= variance;
    currentSquat *= variance;
    currentDead *= variance;
    currentOhp *= variance;

    // --- PUSH DAY ---
    if (Math.random() > 0.1) {
      sessions.push({
        id: uuid(),
        name: "Push Day",
        date: new Date(weekStartMillis).toISOString(),
        duration: 3600,
        exercises: [
          {
            id: "bench-press",
            name: "Bench Press",
            restTime: 120,
            sets: [createSet(currentBench, 10), createSet(currentBench, 8)],
          },
          {
            id: "overhead-press",
            name: "Overhead Press",
            restTime: 90,
            sets: [createSet(currentOhp, 8)],
          },
        ],
      });
    }

    // --- LEG DAY ---
    if (Math.random() > 0.1) {
      sessions.push({
        id: uuid(),
        name: "Leg Day",
        date: new Date(weekStartMillis + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 4200,
        exercises: [
          {
            id: "squat",
            name: "Squat",
            restTime: 180,
            sets: [createSet(currentSquat, 5), createSet(currentSquat, 5)],
          },
        ],
      });
    }
  }

  await AsyncStorage.setItem("workout_sessions", JSON.stringify(sessions));
  console.log(`✅ Seeded ${sessions.length} workouts. RELOAD YOUR APP NOW.`);
};
