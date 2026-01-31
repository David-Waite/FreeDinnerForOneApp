import React, { memo } from "react";
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
  onToggleExpand: () => void;
  onUpdate: (field: keyof WorkoutSet, value: number) => void;
  onDone: () => void;
  onStartTimer: () => void;
  onRemove: () => void;
};

function SetRowComponent({
  set,
  index,
  isExpanded,
  isError,
  onToggleExpand,
  onUpdate,
  onDone,
  onStartTimer,
  onRemove,
}: Props) {
  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleExpand();
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
          set.completed && !isExpanded && styles.containerCompleted,
          isError && styles.containerError,
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
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.placeholder}
              value={
                set.weight === "0" || set.weight === ""
                  ? ""
                  : String(set.weight)
              }
              onChangeText={(v) => onUpdate("weight", Number(v))}
            />
            <Text style={styles.unit}>KG</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={set.previousReps || "0"}
              placeholderTextColor={Colors.placeholder}
              value={
                set.reps === "0" || set.reps === "" ? "" : String(set.reps)
              }
              onChangeText={(v) => onUpdate("reps", Number(v))}
            />
            <Text style={styles.unit}>REPS</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.bottomRow}>
            {/* REST TIMER BUTTON */}
            <DuoTouch
              style={styles.timerBtn}
              onPress={onStartTimer}
              hapticStyle="light"
            >
              <MaterialCommunityIcons
                name="timer-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.timerText}>REST</Text>
            </DuoTouch>

            {/* DONE / CHECK BUTTON */}
            <DuoTouch
              style={styles.doneBtn}
              onPress={onDone}
              hapticStyle="medium"
            >
              <Ionicons name="checkmark-sharp" size={20} color={Colors.white} />
              <Text style={styles.doneText}>DONE</Text>
            </DuoTouch>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

// Optimization: Check immutable data props and primitives.
// Ignore function props as they are recreated on every parent render.
function arePropsEqual(prev: Props, next: Props) {
  return (
    prev.set === next.set && // Checks object reference (fast & accurate if state is immutable)
    prev.index === next.index &&
    prev.isExpanded === next.isExpanded &&
    prev.isError === next.isError
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
    borderBottomWidth: 4, // 3D Effect
  },
  containerCompleted: {
    backgroundColor: "#233610", // Subdued Dark Green
    borderColor: Colors.primary,
    borderBottomColor: "#46a302",
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

  deleteAction: {
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
  },
});
