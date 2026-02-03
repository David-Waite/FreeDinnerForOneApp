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
  activeRestTimer?: { setId: string; endTime: number } | null; // <--- NEW PROP
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
  onOpenRestTimer: () => void; // <--- NEW PROP
  onSetDone: (setId: string) => void;
};

function ExerciseCardComponent({
  exercise,
  isExpanded,
  expandedSetId,
  highlightedSets,
  activeRestTimer,
  onToggle,
  onSetExpand,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onOpenNotes,
  onStartRestTimer,
  onOpenRestTimer,
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
          {exercise.sets.map((set, index) => {
            // Check if THIS set is the one with the running timer
            const isTimerActive = activeRestTimer?.setId === set.id;

            return (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                isExpanded={expandedSetId === set.id}
                isError={highlightedSets?.has(set.id)}
                // Pass timer data if active
                activeRestEndTime={
                  isTimerActive ? activeRestTimer.endTime : undefined
                }
                onToggleExpand={() =>
                  onSetExpand(expandedSetId === set.id ? null : set.id)
                }
                onUpdate={(field, val) => onUpdateSet(set.id, field, val)}
                onDone={() => onSetDone(set.id)}
                onStartTimer={() => onStartRestTimer(exercise.restTime, set.id)}
                onOpenTimer={onOpenRestTimer}
                onRemove={() => onRemoveSet(set.id)}
              />
            );
          })}

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

function arePropsEqual(prev: Props, next: Props) {
  return (
    prev.isExpanded === next.isExpanded &&
    prev.expandedSetId === next.expandedSetId &&
    prev.exercise === next.exercise &&
    prev.highlightedSets === next.highlightedSets &&
    prev.activeRestTimer === next.activeRestTimer // <--- Check for timer updates
  );
}

export default memo(ExerciseCardComponent, arePropsEqual);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
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
    borderBottomLeftRadius: 18,
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
