import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { Exercise, Set } from "../../constants/types";
import SetRow from "./SetRow";

type Props = {
  exercise: Exercise;
  isExpanded: boolean;
  expandedSetId: string | null;
  onToggle: () => void;
  onSetExpand: (setId: string | null) => void;
  onUpdateSet: (
    setId: string,
    field: keyof Set,
    value: number | boolean,
  ) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onOpenNotes: () => void;
  onStartRestTimer: (duration: number, setId: string) => void;
  onSetDone: (setId: string) => void;
};

export default function ExerciseCard({
  exercise,
  isExpanded,
  expandedSetId,
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

  const handleSetToggle = (setId: string) => {
    // If clicking same set, collapse it. Else open new one.
    onSetExpand(expandedSetId === setId ? null : setId);
  };

  return (
    <View style={styles.card}>
      {/* Exercise Header */}
      <TouchableOpacity
        style={[styles.cardHeader, isExpanded && styles.cardHeaderActive]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.setCountText}>
            {exercise.sets.length} Sets • Rest: {exercise.restTime}s
          </Text>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isComplete ? "checkmark-circle" : "checkmark-circle-outline"}
            size={28}
            color={isComplete ? Colors.primary : "#ccc"}
          />
        </View>
      </TouchableOpacity>

      {/* Exercise Body */}
      {isExpanded && (
        <View style={styles.cardBody}>
          {exercise.sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              index={index}
              isExpanded={expandedSetId === set.id}
              onToggleExpand={() => handleSetToggle(set.id)}
              onUpdate={(field, val) => onUpdateSet(set.id, field, Number(val))}
              onDone={() => onSetDone(set.id)} // Trigger auto-advance logic
              onStartTimer={() => onStartRestTimer(exercise.restTime, set.id)}
              onRemove={() => onRemoveSet(set.id)}
            />
          ))}

          {/* Footer Actions */}
          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.addSetButton} onPress={onAddSet}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.notesButton} onPress={onOpenNotes}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  cardHeaderActive: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  cardHeaderLeft: { flex: 1 },
  exerciseName: { fontSize: 18, fontWeight: "600", color: Colors.text },
  setCountText: { fontSize: 13, color: "#888", marginTop: 4 },
  iconContainer: { marginLeft: 10 },
  cardBody: { padding: 16, backgroundColor: "#fafafa" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addSetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 16,
  },
  addSetText: { fontSize: 12, fontWeight: "600", color: "#555" },
  notesButton: { padding: 8 },
});
