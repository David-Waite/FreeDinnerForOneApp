import React from "react";
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
import Swipeable from "react-native-gesture-handler/Swipeable";
import Colors from "../../constants/Colors";
import { Set } from "../../constants/types";

type Props = {
  set: Set;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: keyof Set, value: number) => void;
  onDone: () => void;
  onStartTimer: () => void;
  onRemove: () => void;
};

export default function SetRow({
  set,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDone,
  onStartTimer,
  onRemove,
}: Props) {
  // Logic: Clicking the row expands it. Clicking again collapses it.
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
          <Ionicons name="trash" size={30} color="#fff" />
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
          set.completed && !isExpanded && styles.containerCompleted, // Green when closed & done
        ]}
      >
        {/* TOP ROW: Inputs */}
        <View style={styles.topRow}>
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
              // FIX: Convert number to string for TextInput
              value={set.weight === 0 ? "" : set.weight.toString()}
              // FIX: Convert string back to number for State
              onChangeText={(v) => onUpdate("weight", Number(v))}
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              // FIX: Convert number to string for TextInput
              value={set.reps === 0 ? "" : set.reps.toString()}
              // FIX: Convert string back to number for State
              onChangeText={(v) => onUpdate("reps", Number(v))}
            />
            <Text style={styles.unit}>reps</Text>
          </View>
        </View>

        {/* BOTTOM ROW: Buttons (Visible only when Expanded) */}
        {isExpanded && (
          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.timerBtn} onPress={onStartTimer}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.timerText}>Rest Timer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  containerCompleted: {
    backgroundColor: "#e8f5e9",
    borderColor: "#c8e6c9", // Light Green
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  badgeCompleted: { backgroundColor: Colors.primary },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#666" },
  badgeTextCompleted: { color: "#fff" },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 60,
    marginRight: 6,
  },
  unit: { fontSize: 14, color: "#888", fontWeight: "500" },

  bottomRow: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 12,
  },
  timerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 10,
  },
  timerText: { color: Colors.primary, fontWeight: "600", marginLeft: 6 },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 10,
  },
  doneText: { color: "#fff", fontWeight: "bold", marginLeft: 6 },

  deleteAction: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
});
