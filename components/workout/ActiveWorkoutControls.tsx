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

type Props = {
  elapsedSeconds: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onMinimize: () => void; // Added
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
  elapsedSeconds,
  isPaused,
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
  useEffect(() => {
    setIsOpen(isPaused);
  }, [isPaused]);

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isOpen ? 0 : HIDDEN_OFFSET,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12,
    }).start();
  }, [isOpen]);

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
          if (gestureState.dy > 60) setIsOpen(false);
          else
            Animated.spring(animValue, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
        } else {
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
            <TouchableOpacity style={styles.homeButton} onPress={onMinimize}>
              <Ionicons name="home" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.centerContainer}>
            <TouchableOpacity
              style={[
                styles.mainActionButton,
                isPaused ? styles.resumeColor : styles.pauseColor,
              ]}
              onPress={onPauseToggle}
            >
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={38}
                color="#000"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.rightContainer} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.finishButton} onPress={onFinish}>
            <Text style={styles.finishText}>End Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel Workout</Text>
          </TouchableOpacity>
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    elevation: 20,
    zIndex: 1000,
  },
  header: {
    height: HEADER_HEIGHT,
    paddingTop: 12,
    alignItems: "center",
    paddingBottom: 20,
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 16,
  },
  timerRow: { marginBottom: 20, alignItems: "center" },
  timerText: {
    fontSize: 48,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: "#333",
    letterSpacing: -1,
  },
  controlsRow: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 40,
    alignItems: "center",
    height: 80,
  },
  leftContainer: { flex: 1, alignItems: "flex-start" },
  centerContainer: { flex: 1, alignItems: "center" },
  rightContainer: { flex: 1 },
  homeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f2f2f7",
    justifyContent: "center",
    alignItems: "center",
  },
  mainActionButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    elevation: 6,
  },
  pauseColor: { backgroundColor: "#FFD60A" },
  resumeColor: { backgroundColor: "#32D74B" },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: "#fff",
  },
  actionsContainer: { gap: 16 },
  finishButton: {
    width: "100%",
    backgroundColor: "#1c1c1e",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
  },
  finishText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cancelButton: {
    width: "100%",
    backgroundColor: "#ffeeee",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
  },
  cancelText: { color: "#FF453A", fontSize: 20, fontWeight: "700" },
});
