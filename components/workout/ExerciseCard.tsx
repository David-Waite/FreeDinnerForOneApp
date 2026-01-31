import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { Exercise, WorkoutSet } from "../../constants/types";
import SetRow from "./SetRow";

type Props = {
  exercise: Exercise;
  isExpanded: boolean;
  expandedSetId: string | null;
  highlightedSets?: Set<string>;
  onToggle: () => void;
  onSetExpand: (setId: string | null) => void;
  onUpdateSet: (
    setId: string,
    field: keyof WorkoutSet,
    value: number | boolean | string,
  ) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onOpenNotes: () => void;
  onStartRestTimer: (duration: number, setId: string) => void;
  onSetDone: (setId: string) => void;
};

function ExerciseCardComponent({
  exercise,
  isExpanded,
  expandedSetId,
  highlightedSets,
  onToggle,
  onSetExpand,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onOpenNotes,
  onStartRestTimer,
  onSetDone,
}: Props) {
  const isComplete =
    exercise.sets.every((s) => s.completed) && exercise.sets.length > 0;

  return (
    <View style={[styles.card, isComplete && styles.cardComplete]}>
      <TouchableOpacity
        style={[styles.cardHeader, isExpanded && styles.cardHeaderActive]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.exerciseName}>{exercise.name.toUpperCase()}</Text>
          <Text style={styles.setCountText}>
            {exercise.sets.length} SETS • REST: {exercise.restTime}S
          </Text>
        </View>
        <View
          style={[styles.statusIcon, isComplete && styles.statusIconComplete]}
        >
          <Ionicons
            name={isComplete ? "checkmark-sharp" : "chevron-down"}
            size={20}
            color={isComplete ? Colors.white : Colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.cardBody}>
          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              index={index}
              isExpanded={expandedSetId === set.id}
              isError={highlightedSets?.has(set.id)}
              onToggleExpand={() =>
                onSetExpand(expandedSetId === set.id ? null : set.id)
              }
              onUpdate={(field, val) => onUpdateSet(set.id, field, val)}
              onDone={() => onSetDone(set.id)}
              onStartTimer={() => onStartRestTimer(exercise.restTime, set.id)}
              onRemove={() => onRemoveSet(set.id)}
            />
          ))}

          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.addSetButton} onPress={onAddSet}>
              <Ionicons name="add" size={18} color={Colors.text} />
              <Text style={styles.addSetText}>ADD SET</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.notesButton} onPress={onOpenNotes}>
              <View style={styles.notesIconCircle}>
                <Ionicons
                  name="document-text"
                  size={20}
                  color={Colors.primary}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Optimization: Only re-render if data/layout state changes.
// We ignore function props (onToggle, etc.) assuming they are stable in logic
// even if their references change (which happens with inline arrow functions).
function arePropsEqual(prev: Props, next: Props) {
  return (
    prev.isExpanded === next.isExpanded &&
    prev.expandedSetId === next.expandedSetId &&
    prev.exercise === next.exercise && // Checks object reference (fast)
    prev.highlightedSets === next.highlightedSets
  );
}

export default memo(ExerciseCardComponent, arePropsEqual);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    marginBottom: 16,
    // REMOVED overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6, // The "Duo" 3D Shelf
  },
  cardComplete: {
    borderColor: Colors.primary,
    borderBottomColor: "#46a302",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    // REMOVED backgroundColor: Colors.surface so it doesn't need its own radius
  },
  cardHeaderActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  cardHeaderLeft: { flex: 1 },
  exerciseName: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  setCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  statusIconComplete: {
    backgroundColor: Colors.primary,
    borderColor: "#46a302",
  },
  cardBody: {
    padding: 12,
    backgroundColor: Colors.background,
    // Manually mask the bottom corners
    borderBottomLeftRadius: 18, // 24px - 6px border
    borderBottomRightRadius: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    gap: 6,
  },
  addSetText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  notesButton: {
    padding: 2,
  },
  notesIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
});
