import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import DuoTouch from "../ui/DuoTouch";

type Props = {
  visible: boolean;
  endTime: number; // CHANGED: We pass the target end time, not seconds
  onMinimize: () => void; // NEW
  onCancel: () => void;
  onAdd30: () => void;
  // "Complete" is handled by skipping the timer, effectively
  onSkip: () => void;
};

export default function RestTimerModal({
  visible,
  endTime,
  onMinimize,
  onCancel,
  onAdd30,
  onSkip,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(0);

  // Visual Tick Only (Logic is in Context)
  useEffect(() => {
    if (visible && endTime) {
      const tick = () => {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);
        setTimeLeft(remaining > 0 ? remaining : 0);
      };

      tick(); // run immediately
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [visible, endTime]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>REST PERIOD</Text>

            {/* MINIMIZE BUTTON */}
            <TouchableOpacity onPress={onMinimize} style={styles.minimizeBtn}>
              <Ionicons
                name="chevron-down"
                size={24}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          </View>

          <View style={styles.controls}>
            {/* PAUSE (Actually just Cancel/Stop for now, per simple logic, or we can just keep running) 
                For now let's keep it simple: Add Time or Skip. 
            */}

            {/* ADD 30 SECONDS */}
            <DuoTouch
              onPress={onAdd30}
              hapticStyle="light"
              style={styles.controlBtn}
            >
              <Text style={styles.addTimeText}>+30S</Text>
            </DuoTouch>
          </View>

          {/* MAIN ACTION: MARK SET COMPLETE (Skip Timer) */}
          <DuoTouch
            onPress={onSkip}
            hapticStyle="success"
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>MARK SET COMPLETE</Text>
          </DuoTouch>

          {/* SECONDARY ACTION: CANCEL TIMER (Go back to set) */}
          <DuoTouch
            onPress={onCancel}
            hapticStyle="light"
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>CANCEL TIMER</Text>
          </DuoTouch>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(19, 31, 36, 0.9)",
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
    borderBottomWidth: 6,
  },
  headerRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
    // We use absolute positioning for the minimize button to keep title centered
  },
  minimizeBtn: {
    position: "absolute",
    right: 0,
    top: -4,
    padding: 4,
  },
  title: {
    fontSize: 12,
    color: Colors.textMuted,
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
    color: Colors.warning, // Changed to Orange/Gold
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
    borderRadius: 18,
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
