import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { useWorkoutTimer } from "../../hooks/useWorkoutTimer";
import DuoTouch from "../ui/DuoTouch";

type Props = {
  elapsedSeconds: number;
  startTime: number | null;
  isPaused: boolean;
  autoExpandTrigger?: number; // New prop to force open
  onPauseToggle: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onMinimize: () => void;
};

const DRAWER_HEIGHT = 420;
const HEADER_HEIGHT = 220;
const HIDDEN_OFFSET = DRAWER_HEIGHT - HEADER_HEIGHT;

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export default function ActiveWorkoutControls({
  isPaused,
  startTime,
  autoExpandTrigger,
  onPauseToggle,
  onFinish,
  onCancel,
  onMinimize,
}: Props) {
  const [isOpen, setIsOpen] = useState(isPaused);
  const isOpenRef = useRef(isOpen);
  const animValue = useRef(
    new Animated.Value(isPaused ? 0 : HIDDEN_OFFSET),
  ).current;

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Sync with Paused state
  useEffect(() => {
    if (isPaused) setIsOpen(true);
  }, [isPaused]);

  // Watch for external trigger (e.g., workout finish)
  useEffect(() => {
    if (autoExpandTrigger && autoExpandTrigger > 0) {
      setIsOpen(true);
    }
  }, [autoExpandTrigger]);

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isOpen ? 0 : HIDDEN_OFFSET,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [isOpen]);

  const elapsedSeconds = useWorkoutTimer(startTime, isPaused);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        const startValue = isOpenRef.current ? 0 : HIDDEN_OFFSET;
        const newValue = startValue + gestureState.dy;
        if (newValue >= -50 && newValue <= HIDDEN_OFFSET + 50) {
          animValue.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isOpenRef.current) {
          // If open, close if dragged down significantly
          if (gestureState.dy > 60) setIsOpen(false);
          else
            Animated.spring(animValue, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
        } else {
          // If closed, open if dragged up significantly
          if (gestureState.dy < -60) setIsOpen(true);
          else
            Animated.spring(animValue, {
              toValue: HIDDEN_OFFSET,
              useNativeDriver: true,
            }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: animValue }] }]}
      {...panResponder.panHandlers}
    >
      <View style={styles.header}>
        <View style={styles.dragHandle} />
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>
        <View style={styles.controlsRow}>
          <View style={styles.leftContainer}>
            {/* MINIMIZE / HOME */}
            <DuoTouch
              style={styles.homeButton}
              onPress={onMinimize}
              hapticStyle="light"
            >
              <Ionicons name="home" size={24} color={Colors.textMuted} />
            </DuoTouch>
          </View>

          <View style={styles.centerContainer}>
            {/* PLAY / PAUSE */}
            <DuoTouch
              style={[
                styles.mainActionButton,
                isPaused ? styles.resumeBtn : styles.pauseBtn,
              ]}
              onPress={onPauseToggle}
              hapticStyle="medium"
            >
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={38}
                color={Colors.white}
              />
            </DuoTouch>
          </View>
          <View style={styles.rightContainer} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.actionsContainer}>
          {/* FINISH WORKOUT */}
          <DuoTouch
            style={styles.finishButton}
            onPress={onFinish}
            hapticStyle="success"
          >
            <Text style={styles.finishText}>END WORKOUT</Text>
          </DuoTouch>

          {/* CANCEL WORKOUT */}
          <DuoTouch
            style={styles.cancelButton}
            onPress={onCancel}
            hapticStyle="heavy"
          >
            <Text style={styles.cancelText}>ABANDON SESSION</Text>
          </DuoTouch>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    elevation: 20,
    zIndex: 1000,
  },
  header: {
    height: HEADER_HEIGHT,
    paddingTop: 12,
    alignItems: "center",
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginBottom: 12,
  },
  timerRow: { marginBottom: 16, alignItems: "center" },
  timerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 54,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: Colors.text,
    letterSpacing: -1,
  },
  controlsRow: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 40,
    alignItems: "center",
    height: 84,
  },
  leftContainer: { flex: 1, alignItems: "flex-start" },
  centerContainer: { flex: 1, alignItems: "center" },
  rightContainer: { flex: 1 },
  homeButton: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  mainActionButton: {
    width: 84,
    height: 84,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 6,
  },
  pauseBtn: {
    backgroundColor: Colors.gold,
    borderBottomColor: "#cc9f00",
  },
  resumeBtn: {
    backgroundColor: Colors.primary,
    borderBottomColor: "#46a302",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  actionsContainer: { gap: 16 },
  finishButton: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  finishText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cancelButton: {
    width: "100%",
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  cancelText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
