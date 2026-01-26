import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  WorkoutSession,
  NotesStorage,
  ExerciseNote,
} from "../..//constants/types";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  workout: WorkoutSession;
  defaultExpanded: boolean;
  allNotes: NotesStorage; // Pass all notes to check against
  onViewNotes: (notes: ExerciseNote[]) => void;
};

export default function HistoryWorkoutCard({
  workout,
  defaultExpanded,
  allNotes,
  onViewNotes,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Logic: Find notes for these exercises that were created on the SAME DAY as the workout
  const sessionNotes = useMemo(() => {
    const relevantNotes: ExerciseNote[] = [];

    workout.exercises.forEach((ex) => {
      const exerciseNotes = allNotes[ex.name] || [];
      const notesForSession = exerciseNotes.filter(
        (n) => n.sessionId === workout.id,
      );

      // Inject exerciseName if missing (for legacy data or safety)
      const notesWithContext = notesForSession.map((n) => ({
        ...n,
        exerciseName: n.exerciseName || ex.name,
      }));

      relevantNotes.push(...notesWithContext);
    });

    return relevantNotes;
  }, [workout, allNotes]);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>{workout.name}</Text>
          <Text style={styles.cardTime}>
            {new Date(workout.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Notes Icon - Only visible if there are notes for this session */}
          {sessionNotes.length > 0 && (
            <TouchableOpacity
              style={styles.noteIcon}
              onPress={() => onViewNotes(sessionNotes)}
            >
              <Ionicons name="document-text" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#999"
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detailsContainer}>
          {workout.exercises.map((ex) => {
            const completedSets = ex.sets.filter((s) => s.completed);
            if (completedSets.length === 0) return null;

            return (
              <View key={ex.id} style={styles.exerciseBlock}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <View style={styles.setRowHeader}>
                  <Text style={[styles.colText, styles.colSet]}>Set</Text>
                  <Text style={styles.colText}>kg</Text>
                  <Text style={styles.colText}>Reps</Text>
                </View>
                {completedSets.map((set, index) => (
                  <View key={set.id} style={styles.setRow}>
                    <View style={styles.setBadge}>
                      <Text style={styles.setText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.valText}>{set.weight}</Text>
                    <Text style={styles.valText}>{set.reps}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          {workout.exercises.every(
            (e) => e.sets.filter((s) => s.completed).length === 0,
          ) && <Text style={styles.emptyText}>No sets completed.</Text>}
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
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  noteIcon: { padding: 4, backgroundColor: "#f0f9ff", borderRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  cardTime: { fontSize: 14, color: "#888", marginTop: 2 },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  exerciseBlock: { marginTop: 16 },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  setRowHeader: {
    flexDirection: "row",
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  colText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#aaa",
    textAlign: "center",
  },
  colSet: { textAlign: "left", paddingLeft: 4 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "#fafafa",
    padding: 8,
    borderRadius: 8,
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flex: 1,
    maxWidth: 30,
  },
  setText: { fontSize: 11, fontWeight: "bold", color: "#666" },
  valText: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 10,
    fontStyle: "italic",
  },
});
