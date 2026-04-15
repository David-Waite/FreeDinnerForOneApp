import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { CardioActivityType } from "../constants/types";
import {
  LOCATION_TASK_NAME,
  ACTIVE_CARDIO_KEY,
  BG_LAST_LOC_KEY,
} from "../tasks/locationTask";

// Re-export so consumers can import the key from the hook if preferred.
export { ACTIVE_CARDIO_KEY };

export type ActiveCardioSession = {
  activityType: CardioActivityType;
  startTime: number;
  isPaused: boolean;
  distance: number;
  gpsEnabled: boolean;
};

export const useCardioSession = () => {
  const [activeCardio, setActiveCardio] = useState<ActiveCardioSession | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(ACTIVE_CARDIO_KEY);
      if (json) setActiveCardio(JSON.parse(json));
    })();
  }, []);

  const persist = async (state: ActiveCardioSession | null) => {
    if (state) await AsyncStorage.setItem(ACTIVE_CARDIO_KEY, JSON.stringify(state));
    else await AsyncStorage.removeItem(ACTIVE_CARDIO_KEY);
  };

  const startCardioSession = useCallback(
    async (activityType: CardioActivityType, gpsEnabled: boolean) => {
      const state: ActiveCardioSession = {
        activityType,
        startTime: Date.now(),
        isPaused: false,
        distance: 0,
        gpsEnabled,
      };
      setActiveCardio(state);
      await persist(state);

      if (gpsEnabled) {
        // Clear any stale last-position from a previous session.
        await AsyncStorage.removeItem(BG_LAST_LOC_KEY);

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // metres — matches previous watchPositionAsync config
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "Thecomp is tracking your workout",
            notificationBody: "GPS active — tracking distance in the background.",
          },
        });
      }
    },
    [],
  );

  const toggleCardioPause = useCallback(() => {
    setActiveCardio((prev) => {
      if (!prev) return prev;
      const next = { ...prev, isPaused: !prev.isPaused };
      persist(next);
      return next;
    });
  }, []);

  const updateCardioDistance = useCallback((distance: number) => {
    setActiveCardio((prev) => {
      if (!prev) return prev;
      const next = { ...prev, distance };
      persist(next);
      return next;
    });
  }, []);

  const stopLocationUpdates = useCallback(async () => {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME,
      );
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch {
      // Task may not be registered yet on first cold start — safe to ignore.
    }
    await AsyncStorage.removeItem(BG_LAST_LOC_KEY);
  }, []);

  const endCardioSession = useCallback(async () => {
    await stopLocationUpdates();
    setActiveCardio(null);
    await AsyncStorage.removeItem(ACTIVE_CARDIO_KEY);
  }, [stopLocationUpdates]);

  const abandonCardioSession = useCallback(async () => {
    await stopLocationUpdates();
    setActiveCardio(null);
    await AsyncStorage.removeItem(ACTIVE_CARDIO_KEY);
  }, [stopLocationUpdates]);

  return {
    isCardioActive: !!activeCardio,
    activeCardio,
    startCardioSession,
    toggleCardioPause,
    updateCardioDistance,
    endCardioSession,
    abandonCardioSession,
  };
};
