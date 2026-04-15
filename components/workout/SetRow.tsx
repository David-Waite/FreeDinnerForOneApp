import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Animated,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { WorkoutSet } from "../../constants/types";
import DuoTouch from "../ui/DuoTouch";
import { Swipeable } from "react-native-gesture-handler";

type Props = {
  set: WorkoutSet;
  index: number;
  isExpanded: boolean;
  isError?: boolean;
  activeRestEndTime?: number;
  onToggleExpand: () => void;
  onUpdate: (field: keyof WorkoutSet, value: string | number) => void;
  onCompleteSet: () => void;
  onResetSet: () => void;
  onOpenTimer: () => void;
  onRemove: () => void;
  onInputFocus: (index: number) => void;
};

function SetRowComponent({
  set,
  index,
  isExpanded,
  isError,
  activeRestEndTime,
  onToggleExpand,
  onUpdate,
  onCompleteSet,
  onResetSet,
  onOpenTimer,
  onRemove,
  onInputFocus,
}: Props) {
  const weightInputRef = useRef<TextInput>(null);
  const repsInputRef = useRef<TextInput>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Auto-focus the right input when the row opens
  useEffect(() => {
    if (!isExpanded) return;
    const t = setTimeout(() => {
      const weightEmpty = !set.weight || set.weight === "" || set.weight === "0";
      (weightEmpty ? weightInputRef : repsInputRef).current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isExpanded]);

  // --- TIMER TICKER ---
  useEffect(() => {
    if (activeRestEndTime) {
      const tick = () => {
        const now = Date.now();
        const diff = Math.ceil((activeRestEndTime - now) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);
      };

      tick(); // Immediate update
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [activeRestEndTime]);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // CHANGED: If we are opening the row, trigger the scroll logic
    if (!isExpanded) {
      onInputFocus(index);
    }

    onToggleExpand();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const renderRightActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <View style={styles.deleteAction}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={26} color={Colors.white} />
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      onSwipeableOpen={onRemove}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.container,
          set.completed && styles.containerCompleted,
          isError && styles.containerError,
          !!activeRestEndTime && timeLeft > 0 && styles.containerTimerActive,
        ]}
      >
        <View style={styles.topRow}>
          {/* SQUIRCLE BADGE */}
          <View style={[styles.badge, set.completed && styles.badgeCompleted]}>
            <Text
              style={[
                styles.badgeText,
                set.completed && styles.badgeTextCompleted,
              ]}
            >
              {index + 1}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              ref={weightInputRef}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.placeholder}
              value={
                set.weight === "0" || set.weight === ""
                  ? ""
                  : String(set.weight)
              }
              onChangeText={(v) => onUpdate("weight", v)}
              onFocus={() => onInputFocus(index)}
            />
            <Text style={styles.unit}>KG</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              ref={repsInputRef}
              style={styles.input}
              keyboardType="numeric"
              placeholder={set.previousReps || "0"}
              placeholderTextColor={Colors.placeholder}
              value={
                set.reps === "0" || set.reps === "" ? "" : String(set.reps)
              }
              onChangeText={(v) => onUpdate("reps", Number(v))}
              onFocus={() => onInputFocus(index)}
            />
            <Text style={styles.unit}>REPS</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.bottomRow}>
            {activeRestEndTime && timeLeft > 0 ? (
              // Timer is running — show orange countdown, tap to open modal
              <DuoTouch
                style={styles.timerBtnActive}
                onPress={onOpenTimer}
                hapticStyle="light"
              >
                <MaterialCommunityIcons
                  name="timer-sand"
                  size={20}
                  color={Colors.white}
                />
                <Text style={styles.timerTextActive}>
                  {formatTime(timeLeft)}
                </Text>
              </DuoTouch>
            ) : set.completed ? (
              // Already done, timer not running — offer to reset
              <DuoTouch
                style={styles.resetBtn}
                onPress={onResetSet}
                hapticStyle="medium"
              >
                <Ionicons name="refresh" size={20} color={Colors.textMuted} />
                <Text style={styles.resetText}>RESET SET</Text>
              </DuoTouch>
            ) : (
              // Fresh set — primary complete action
              <DuoTouch
                style={styles.doneBtn}
                onPress={onCompleteSet}
                hapticStyle="medium"
              >
                <Ionicons name="checkmark-sharp" size={20} color={Colors.white} />
                <Text style={styles.doneText}>COMPLETE SET</Text>
              </DuoTouch>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

function arePropsEqual(prev: Props, next: Props) {
  return (
    prev.set === next.set &&
    prev.index === next.index &&
    prev.isExpanded === next.isExpanded &&
    prev.isError === next.isError &&
    prev.activeRestEndTime === next.activeRestEndTime &&
    prev.onCompleteSet === next.onCompleteSet &&
    prev.onInputFocus === next.onInputFocus
  );
}

export default memo(SetRowComponent, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  containerCompleted: {
    backgroundColor: "#233610",
    borderColor: Colors.primary,
    borderBottomColor: "#46a302",
  },
  containerTimerActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.warning,
    borderBottomColor: "#cc7a00",
  },
  containerError: {
    borderColor: Colors.error,
    borderBottomColor: "#a62626",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeCompleted: {
    backgroundColor: Colors.primary,
    borderColor: "#46a302",
  },
  badgeText: { fontSize: 13, fontWeight: "900", color: Colors.text },
  badgeTextCompleted: { color: Colors.white },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    minWidth: 55,
    marginRight: 6,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unit: { fontSize: 10, color: Colors.textMuted, fontWeight: "800" },

  bottomRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    gap: 10,
  },
  // --- DEFAULT TIMER STYLES ---
  timerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  timerText: {
    color: Colors.primary,
    fontWeight: "900",
    marginLeft: 6,
    fontSize: 12,
  },
  // --- ACTIVE TIMER STYLES (ORANGE) ---
  timerBtnActive: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.warning, // Orange
    padding: 10,
    borderRadius: 12,
    borderBottomWidth: 4,
    borderBottomColor: "#cc7a00", // Darker Orange
  },
  timerTextActive: {
    color: Colors.white,
    fontWeight: "900",
    marginLeft: 6,
    fontSize: 14, // Slightly larger
    fontVariant: ["tabular-nums"],
  },

  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 12,
    borderBottomWidth: 4,
    borderBottomColor: "#46a302",
  },
  doneText: {
    color: Colors.white,
    fontWeight: "900",
    marginLeft: 6,
    fontSize: 12,
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
  },
  resetText: {
    color: Colors.textMuted,
    fontWeight: "900",
    marginLeft: 6,
    fontSize: 12,
  },

  deleteAction: {
    backgroundColor: Colors.error, // swipe to delete
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
  },
});
