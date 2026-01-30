import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalWrapper}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>WORKOUT STATS</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
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
                size={60}
                color={Colors.border}
              />
              <Text style={styles.errorText}>SESSION NOT FOUND</Text>
              <Text style={styles.errorSub}>
                This workout might have been lost in the streak.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Summary Card (Hero Section) */}
              <View style={styles.summaryCard}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={32}
                    color={Colors.gold}
                  />
                </View>
                <Text style={styles.workoutName}>
                  {workout.name.toUpperCase()}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="time" size={14} color={Colors.white} />
                    <Text style={styles.metaText}>
                      {formatDuration(workout.duration)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: Colors.secondary },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arm-flex"
                      size={14}
                      color={Colors.white}
                    />
                    <Text style={styles.metaText}>
                      {workout.exercises.length} EXERCISES
                    </Text>
                  </View>
                </View>
              </View>

              {/* Exercises List */}
              {workout.exercises.map((exercise, index) => (
                <View
                  key={`${exercise.id}-${index}`}
                  style={styles.exerciseCard}
                >
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <View style={styles.restBadge}>
                      <Text style={styles.restText}>
                        {exercise.restTime}s REST
                      </Text>
                    </View>
                  </View>

                  {/* Sets Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={styles.colLabelSet}>SET</Text>
                    <Text style={styles.colLabel}>WEIGHT</Text>
                    <Text style={styles.colLabel}>REPS</Text>
                  </View>

                  {/* Sets Rows */}
                  {exercise.sets.map((set, idx) => (
                    <View
                      key={set.id}
                      style={[
                        styles.setRow,
                        set.completed && styles.rowCompleted,
                      ]}
                    >
                      <View style={styles.colSetContent}>
                        <View style={styles.setNumberBadge}>
                          <Text style={styles.setNumberText}>{idx + 1}</Text>
                        </View>
                      </View>
                      <Text style={styles.colDataText}>
                        {set.weight || "0"}{" "}
                        <Text style={styles.unitText}>KG</Text>
                      </Text>
                      <Text style={styles.colDataText}>
                        {set.reps || "0"}{" "}
                        <Text style={styles.unitText}>REPS</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    padding: 16,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  closeBtn: { position: "absolute", right: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
  },
  errorSub: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    fontWeight: "600",
  },
  content: { padding: 16 },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    borderBottomWidth: 5,
    borderBottomColor: Colors.border,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  metaRow: { flexDirection: "row", gap: 10 },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaText: { color: Colors.white, fontSize: 13, fontWeight: "800" },

  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  exerciseHeader: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: { fontSize: 17, fontWeight: "800", color: Colors.text },
  restBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restText: { fontSize: 10, fontWeight: "800", color: Colors.textMuted },

  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    alignItems: "center",
  },
  // Fix the SET label to match the badge width
  colLabelSet: {
    width: 40, // Match colSetContent width
    fontSize: 11,
    fontWeight: "900",
    color: Colors.placeholder,
    textAlign: "center",
  },
  colLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    color: Colors.placeholder,
    textAlign: "center",
  },

  setRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  // Container for the badge to ensure it stays centered under the "SET" header
  colSetContent: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colDataText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  rowCompleted: { backgroundColor: "#233610" }, // Subdued Success Green

  setNumberText: { fontSize: 14, fontWeight: "900", color: Colors.text },

  unitText: { fontSize: 10, color: Colors.textMuted, fontWeight: "700" },
});
