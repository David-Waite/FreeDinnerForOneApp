import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { WorkoutSession } from "../../constants/types";
import Colors from "../../constants/Colors";

type Props = {
  visible: boolean;
  workoutId: string | null;
  authorId?: string | null;
  onClose: () => void;
};

export default function WorkoutDetailsModal({
  visible,
  workoutId,
  authorId,
  onClose,
}: Props) {
  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && workoutId) {
      loadWorkout();
    } else {
      setWorkout(null);
    }
  }, [visible, workoutId]);

  const loadWorkout = async () => {
    setLoading(true);
    if (workoutId) {
      const data = await WorkoutRepository.getWorkoutById(
        workoutId,
        authorId || undefined,
      );
      setWorkout(data || null);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={30} color="#ccc" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : !workout ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color="#ccc"
            />
            <Text style={styles.errorText}>Workout details not found.</Text>
            <Text style={styles.errorSub}>
              This workout might have been deleted from the device.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Workout Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.metaText}>
                    {new Date(workout.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.metaText}>
                    {formatDuration(workout.duration)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Exercises List */}
            {workout.exercises.map((exercise, index) => (
              <View key={`${exercise.id}-${index}`} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.restText}>
                    Rest: {exercise.restTime}s
                  </Text>
                </View>

                {/* Sets Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.colSet}>SET</Text>
                  <Text style={styles.colData}>KG</Text>
                  <Text style={styles.colData}>REPS</Text>
                </View>

                {/* Sets Rows */}
                {exercise.sets.map((set, idx) => (
                  <View
                    key={set.id}
                    style={[
                      styles.setRow,
                      idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
                      set.completed && styles.rowCompleted,
                    ]}
                  >
                    <View style={styles.setNumberBadge}>
                      <Text style={styles.setNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.colDataText}>{set.weight || "-"}</Text>
                    <Text style={styles.colDataText}>{set.reps || "-"}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  closeBtn: { padding: 4 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: "600", color: "#666" },
  errorSub: { marginTop: 8, fontSize: 14, color: "#999", textAlign: "center" },
  content: { padding: 16 },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  metaRow: { flexDirection: "row", gap: 20 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#666", fontSize: 14, fontWeight: "500" },

  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  exerciseHeader: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: { fontSize: 16, fontWeight: "700", color: "#333" },
  restText: { fontSize: 12, color: "#999" },

  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  colSet: { width: 50, fontSize: 12, fontWeight: "bold", color: "#aaa" },
  colData: {
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
    color: "#aaa",
    textAlign: "center",
  },

  setRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  rowEven: { backgroundColor: "#fff" },
  rowOdd: { backgroundColor: "#fcfcfc" },
  rowCompleted: { backgroundColor: "#f0fdf4" }, // Very light green

  setNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 26, // Align with colSet
  },
  setNumberText: { fontSize: 12, fontWeight: "bold", color: "#666" },
  colDataText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
});
