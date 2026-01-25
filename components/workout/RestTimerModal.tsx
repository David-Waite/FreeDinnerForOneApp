import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  seconds: number;
  onClose: () => void;
  onComplete: () => void;
};

export default function RestTimerModal({
  visible,
  seconds,
  onClose,
  onComplete,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isActive, setIsActive] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setTimeLeft(seconds);
      setIsActive(true);
    } else {
      setIsActive(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [visible, seconds]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const addTime = (amount: number) => setTimeLeft((prev) => prev + amount);

  const handleComplete = () => {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onComplete();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Rest</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleTimer} style={styles.controlBtn}>
              <Ionicons
                name={isActive ? "pause" : "play"}
                size={32}
                color={Colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => addTime(30)}
              style={styles.controlBtn}
            >
              <Text style={styles.addTimeText}>+30s</Text>
            </TouchableOpacity>
          </View>

          {/* UPDATE: Calls handleComplete() which triggers the done logic */}
          <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip & Mark Complete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsActive(false);
              onClose();
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  timerText: {
    fontSize: 64,
    fontWeight: "200",
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 24,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f2f2f7",
    justifyContent: "center",
    alignItems: "center",
  },
  addTimeText: { fontWeight: "bold", color: Colors.primary },
  skipBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  skipText: { color: "#fff", fontWeight: "bold" },
  closeBtn: { marginTop: 12, padding: 8 },
  closeText: { color: "#ff4444" },
});
