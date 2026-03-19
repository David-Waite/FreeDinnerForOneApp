import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CardioActivityType } from "../constants/types";

const ACTIVE_CARDIO_KEY = "active_cardio_session";

export type ActiveCardioSession = {
  activityType: CardioActivityType;
  startTime: number;
  isPaused: boolean;
  distance: number;
  gpsEnabled: boolean;
};

export const useCardioSession = () => {
  const [activeCardio, setActiveCardio] = useState<ActiveCardioSession | null>(null);

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

  const startCardioSession = useCallback(async (activityType: CardioActivityType, gpsEnabled: boolean) => {
    const state: ActiveCardioSession = {
      activityType,
      startTime: Date.now(),
      isPaused: false,
      distance: 0,
      gpsEnabled,
    };
    setActiveCardio(state);
    await persist(state);
  }, []);

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

  const endCardioSession = useCallback(async () => {
    setActiveCardio(null);
    await AsyncStorage.removeItem(ACTIVE_CARDIO_KEY);
  }, []);

  const abandonCardioSession = useCallback(async () => {
    setActiveCardio(null);
    await AsyncStorage.removeItem(ACTIVE_CARDIO_KEY);
  }, []);

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
