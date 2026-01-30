import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
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
          <Text style={styles.title}>REST PERIOD</Text>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={toggleTimer}
              style={[
                styles.controlBtn,
                { backgroundColor: isActive ? Colors.surface : Colors.primary },
              ]}
            >
              <Ionicons
                name={isActive ? "pause" : "play"}
                size={28}
                color={isActive ? Colors.primary : Colors.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => addTime(30)}
              style={styles.controlBtn}
            >
              <Text style={styles.addTimeText}>+30S</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleComplete} style={styles.skipBtn}>
            <Text style={styles.skipText}>MARK SET COMPLETE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsActive(false);
              onClose();
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(19, 31, 36, 0.9)", // Duo Navy semi-transparent
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: 320,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6, // Signature 3D shelf
  },
  title: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
    letterSpacing: 2,
    fontWeight: "900",
  },
  timerContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  timerText: {
    fontSize: 64,
    fontWeight: "900",
    color: Colors.gold, // Rest is gold/energy
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 20,
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 18, // Squircle-style
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  addTimeText: {
    fontWeight: "900",
    color: Colors.text,
    fontSize: 16,
  },
  skipBtn: {
    marginTop: 32,
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  skipText: {
    color: Colors.white,
    fontWeight: "900",
    letterSpacing: 1,
    fontSize: 14,
  },
  closeBtn: {
    marginTop: 20,
    padding: 8,
  },
  closeText: {
    color: Colors.textMuted,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
});
