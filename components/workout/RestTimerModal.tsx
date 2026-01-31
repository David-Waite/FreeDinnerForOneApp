import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  AppState, // <--- 1. Import AppState
  AppStateStatus,
} from "react-native";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { NotificationService } from "../../services/NotificationService";
import DuoTouch from "../ui/DuoTouch";

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

  // We track the exact timestamp when the timer SHOULD end
  const endTimeRef = useRef<number>(0);
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. INITIAL SETUP ---
  useEffect(() => {
    if (visible) {
      startTimer(seconds);
    } else {
      stopTimer();
    }
  }, [visible, seconds]);

  // --- 2. HANDLE BACKGROUND/FOREGROUND ---
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // APP JUST WOKE UP
        if (isActive && endTimeRef.current > 0) {
          const now = Date.now();
          const remaining = Math.ceil((endTimeRef.current - now) / 1000);

          if (remaining <= 0) {
            setTimeLeft(0);
            handleComplete();
          } else {
            setTimeLeft(remaining);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isActive]);

  // --- 3. THE TICKER (Visual Only) ---
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  // --- HELPER FUNCTIONS ---

  const startTimer = (duration: number) => {
    setTimeLeft(duration);
    setIsActive(true);

    // Calculate the target end time (e.g., Now + 60000ms)
    endTimeRef.current = Date.now() + duration * 1000;

    // Sync Notification
    NotificationService.cancelAllNotifications();
    NotificationService.scheduleRestTimer(duration);
  };

  const stopTimer = () => {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    NotificationService.cancelAllNotifications();
  };

  const toggleTimer = () => {
    if (isActive) {
      // PAUSE: Just stop everything
      setIsActive(false);
      NotificationService.cancelAllNotifications();
    } else {
      // RESUME: Recalculate end time based on CURRENT timeLeft
      setIsActive(true);
      endTimeRef.current = Date.now() + timeLeft * 1000;
      NotificationService.scheduleRestTimer(timeLeft);
    }
  };

  const addTime = (amount: number) => {
    const newTime = timeLeft + amount;
    setTimeLeft(newTime);

    // If active, push the end time back
    if (isActive) {
      endTimeRef.current = Date.now() + newTime * 1000;
      NotificationService.cancelAllNotifications();
      NotificationService.scheduleRestTimer(newTime);
    }
  };

  const handleComplete = () => {
    stopTimer();
    onComplete();
  };

  const handleCancel = () => {
    stopTimer();
    onClose();
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
            {/* PLAY / PAUSE TOGGLE */}
            <DuoTouch
              onPress={toggleTimer}
              hapticStyle="medium"
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
            </DuoTouch>

            {/* ADD 30 SECONDS */}
            <DuoTouch
              onPress={() => addTime(30)}
              hapticStyle="light"
              style={styles.controlBtn}
            >
              <Text style={styles.addTimeText}>+30S</Text>
            </DuoTouch>
          </View>

          {/* MAIN ACTION: MARK SET COMPLETE */}
          <DuoTouch
            onPress={handleComplete}
            hapticStyle="success" // A victory pulse for finishing the set!
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>MARK SET COMPLETE</Text>
          </DuoTouch>

          {/* SECONDARY ACTION: CANCEL */}
          <DuoTouch
            onPress={handleCancel}
            hapticStyle="light"
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>CANCEL</Text>
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
    color: Colors.gold,
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
