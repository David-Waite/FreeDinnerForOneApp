import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useWorkoutContext } from "../context/WorkoutContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useWorkoutTimer } from "../hooks/useWorkoutTimer";

export default function GlobalWorkoutBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isActive,
    sessionId,
    sessionName,
    startTime,
    isPaused,
    restTimer,
    maximizeRestTimer,
    isCardioActive,
    activeCardio,
  } = useWorkoutContext();

  const elapsedSeconds = useWorkoutTimer(isActive ? startTime : null, isPaused);
  const cardioElapsed = useWorkoutTimer(
    isCardioActive ? (activeCardio?.startTime ?? null) : null,
    activeCardio?.isPaused ?? false,
  );
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);

  // LOGGING STATE CHANGES
  useEffect(() => {
    if (restTimer) {
      console.log(
        `[Banner] Update: Finished=${restTimer.isFinished}, EndTime=${restTimer.endTime}`,
      );
    }
  }, [restTimer]);

  // --- TICKER ---
  useEffect(() => {
    if (restTimer && !restTimer.isFinished) {
      const update = () => {
        const left = Math.ceil((restTimer.endTime - Date.now()) / 1000);
        setRestSecondsLeft(left > 0 ? left : 0);
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    } else if (restTimer?.isFinished) {
      setRestSecondsLeft(0);
    }
  }, [restTimer]);

  // DECISION LOGIC
  const showRestBanner = !!restTimer;
  const isRestFinished = restTimer?.isFinished ?? false;

  const showSessionBanner =
    isActive && sessionId && pathname !== "/record-workout" && !showRestBanner;

  const showCardioBanner =
    isCardioActive && pathname !== "/record-cardio" && !showRestBanner && !showSessionBanner;

  if (!showRestBanner && !showSessionBanner && !showCardioBanner) return null;

  const handlePress = () => {
    if (showRestBanner) {
      maximizeRestTimer();
      if (pathname !== "/record-workout") {
        router.push("/record-workout");
      }
    } else if (showCardioBanner) {
      router.push("/record-cardio");
    } else {
      router.push("/record-workout");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // --- DYNAMIC STYLING ---
  let backgroundColor = Colors.primary;
  let borderColor = "#46a302";
  let iconName: any = "lightning-bolt";
  let labelText = "LIVE SESSION";
  let titleText = sessionName || "Workout";
  let timeText = formatTime(elapsedSeconds);

  if (showCardioBanner) {
    const activityType = activeCardio?.activityType ?? "run";
    const activityLabel = activityType === "run" ? "RUN" : activityType === "walk" ? "WALK" : "CYCLE";
    const activityIcon = activityType === "run" ? "run-fast" : activityType === "walk" ? "walk" : "bike";
    backgroundColor = activityType === "run" ? Colors.error : activityType === "walk" ? Colors.info : Colors.warning;
    borderColor = activityType === "run" ? "#a62626" : activityType === "walk" ? "#1a6b99" : "#cc7a00";
    iconName = activityIcon;
    labelText = "LIVE " + activityLabel;
    titleText = activityLabel + " IN PROGRESS";
    timeText = formatTime(cardioElapsed);
  }

  if (showRestBanner) {
    if (isRestFinished) {
      // --- FINISHED STATE (RED) ---
      backgroundColor = Colors.error;
      borderColor = "#a62626";
      iconName = "bell-ring";
      labelText = "REST COMPLETE";
      titleText = `Next: ${restTimer?.exerciseName}`;
      timeText = "READY";
    } else {
      // --- COUNTDOWN STATE (ORANGE) ---
      backgroundColor = Colors.warning;
      borderColor = "#cc7a00";
      iconName = "timer-sand";
      labelText = "REST TIMER";
      titleText = restTimer?.exerciseName || "Rest";
      timeText = formatTime(restSecondsLeft);
    }
  }

  return (
    <View style={[styles.wrapper, { backgroundColor }]}>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor }]}
        edges={["top"]}
      >
        <TouchableOpacity
          style={[
            styles.container,
            { backgroundColor, borderBottomColor: borderColor },
          ]}
          onPress={handlePress}
          activeOpacity={0.9}
        >
          <View style={styles.content}>
            <View style={styles.leftSide}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={16}
                  color={Colors.white}
                />
              </View>
              <View>
                <Text style={styles.label}>{labelText}</Text>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {titleText}
                </Text>
              </View>
            </View>

            <View style={styles.rightSide}>
              <View style={styles.timerContainer}>
                {isRestFinished ? (
                  <MaterialCommunityIcons
                    name="check-bold"
                    size={14}
                    color={Colors.white}
                  />
                ) : (
                  <Ionicons name="time" size={14} color={Colors.white} />
                )}
                <Text style={styles.timer}>{timeText}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.white} />
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  safeArea: {},
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1,
  },
  sessionTitle: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 14,
    marginTop: -2,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  timer: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
});
