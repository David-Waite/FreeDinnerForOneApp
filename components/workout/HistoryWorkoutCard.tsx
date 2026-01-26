import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  WorkoutSession,
  NotesStorage,
  ExerciseNote,
} from "../../constants/types";
import Colors from "../../constants/Colors";

type Props = {
  workout: WorkoutSession;
  defaultExpanded?: boolean;
  allNotes: NotesStorage;
  onViewNotes: (notes: ExerciseNote[]) => void;
};

export default function HistoryWorkoutCard({
  workout,
  defaultExpanded = false,
  allNotes,
  onViewNotes,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Calculate total volume or sets
  const totalSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0,
  );

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0m";
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{workout.name}</Text>
          <Text style={styles.subtitle}>
            {new Date(workout.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {formatDuration(workout.duration)} • {totalSets} Sets
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#999"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {workout.exercises.map((ex, i) => {
            const exerciseNotes = (allNotes[ex.name] || []).filter(
              (n) => n.sessionId === workout.id,
            );
            const hasNotes = exerciseNotes.length > 0;

            return (
              <View key={ex.id || i} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {ex.sets.length} sets
                    {ex.sets.some((s) => s.weight)
                      ? ` • Max: ${Math.max(...ex.sets.map((s) => Number(s.weight) || 0))}kg`
                      : ""}
                  </Text>
                </View>
                {hasNotes && (
                  <TouchableOpacity
                    style={styles.noteButton}
                    onPress={() => onViewNotes(exerciseNotes)}
                  >
                    <Ionicons
                      name="document-text"
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
    // Shadow
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#888" },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: "600", color: "#444" },
  exerciseDetails: { fontSize: 12, color: "#999", marginTop: 2 },
  noteButton: {
    padding: 6,
    backgroundColor: "#f0f9ff",
    borderRadius: 6,
  },
});
