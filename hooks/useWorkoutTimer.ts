import { useState, useEffect } from "react";

export const useWorkoutTimer = (
  startTime: number | null,
  isPaused: boolean = false,
) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setSeconds(0);
      return;
    }

    // Initialize immediately so we don't wait 1 sec for first render
    const update = () => {
      const now = Date.now();
      setSeconds(Math.floor((now - startTime) / 1000));
    };

    update(); // Run once on mount

    if (isPaused) return;

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  return seconds;
};
