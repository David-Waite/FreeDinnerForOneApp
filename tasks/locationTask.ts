import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOCATION_TASK_NAME = "background-location-task";

// Separate key so the foreground doesn't have to decode it out of the session object.
// The task writes the last seen coordinates here so it can calculate incremental distance
// across individual callbacks without resetting on app-resume.
export const BG_LAST_LOC_KEY = "bg_last_location";

// Re-exported so task file is the single source of truth for this key.
export const ACTIVE_CARDIO_KEY = "active_cardio_session";

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// This task fires for every GPS update whether the app is in the foreground or background.
// It is the single source of truth for accumulated distance — the foreground UI polls
// AsyncStorage once per second to show the latest value.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[LocationTask] error:", error.message);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const cardioJson = await AsyncStorage.getItem(ACTIVE_CARDIO_KEY);
  if (!cardioJson) return;

  const cardio = JSON.parse(cardioJson);

  // Respect the paused flag — don't add distance while paused.
  if (cardio.isPaused || !cardio.gpsEnabled) return;

  const lastLocJson = await AsyncStorage.getItem(BG_LAST_LOC_KEY);
  let lastLoc: { latitude: number; longitude: number } | null = lastLocJson
    ? JSON.parse(lastLocJson)
    : null;

  let accumulated: number = cardio.distance || 0;

  for (const loc of locations) {
    if (lastLoc) {
      accumulated += getDistanceKm(
        lastLoc.latitude,
        lastLoc.longitude,
        loc.coords.latitude,
        loc.coords.longitude,
      );
    }
    lastLoc = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  }

  // Write the updated distance back into the session record and persist the last position.
  await AsyncStorage.setItem(
    ACTIVE_CARDIO_KEY,
    JSON.stringify({ ...cardio, distance: accumulated }),
  );

  if (lastLoc) {
    await AsyncStorage.setItem(BG_LAST_LOC_KEY, JSON.stringify(lastLoc));
  }
});
