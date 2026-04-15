import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AppAlert, { AppAlertButton } from "../ui/AppAlert";
import {
  WorkoutSession,
  NotesStorage,
  ExerciseNote,
} from "../../constants/types";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutRepository } from "../../services/WorkoutRepository";

type Props = {
  workout: WorkoutSession;
  allNotes: NotesStorage;
  onViewNotes: (notes: ExerciseNote[]) => void;
  onDeleted: () => void;
};

export default function HistoryWorkoutCard({
  workout,
  allNotes,
  onViewNotes,
  onDeleted,
}: Props) {
  const [alertConfig, setAlertConfig] = useState<{ title: string; message?: string; buttons?: AppAlertButton[] } | null>(null);

  const sessionNotes = useMemo(() => {
    const relevantNotes: ExerciseNote[] = [];
    workout.exercises.forEach((ex) => {
      const exerciseNotes = allNotes[ex.name] || [];
      const notesForSession = exerciseNotes.filter(
        (n) => n.sessionId === workout.id,
      );
      const notesWithContext = notesForSession.map((n) => ({
        ...n,
        exerciseName: n.exerciseName || ex.name,
      }));
      relevantNotes.push(...notesWithContext);
    });
    return relevantNotes;
  }, [workout, allNotes]);

  const handleDelete = () => {
    setAlertConfig({
      title: "DELETE SESSION",
      message: "Remove this workout session?",
      buttons: [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            await WorkoutRepository.deleteWorkout(workout.id);
            onDeleted();
          },
        },
      ],
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>{workout.name.toUpperCase()}</Text>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.cardTime}>
              {new Date(workout.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {sessionNotes.length > 0 && (
            <TouchableOpacity
              style={styles.noteIcon}
              onPress={() => onViewNotes(sessionNotes)}
            >
              <Ionicons name="document-text" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        {workout.exercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed);
          if (completedSets.length === 0) return null;

          return (
            <View key={ex.id} style={styles.exerciseBlock}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {completedSets.length} SETS
                  </Text>
                </View>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.colText, styles.colSet]}>SET</Text>
                <Text style={styles.colText}>KG</Text>
                <Text style={styles.colText}>REPS</Text>
              </View>

              {completedSets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <View style={styles.setNumberContainer}>
                    <View style={styles.setBadge}>
                      <Text style={styles.setText}>{index + 1}</Text>
                    </View>
                  </View>
                  <Text style={styles.valText}>{set.weight || "-"}</Text>
                  <Text style={styles.valText}>{set.reps || "-"}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
      <AppAlert
        visible={!!alertConfig}
        title={alertConfig?.title ?? ""}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons}
        onClose={() => setAlertConfig(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  cardTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  noteIcon: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  exerciseBlock: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primaryBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countText: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.primary,
  },

  tableHeader: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  colText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    color: Colors.placeholder,
    textAlign: "center",
  },
  colSet: { textAlign: "left", width: 35, flex: 0 },

  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setNumberContainer: {
    width: 35,
    alignItems: "center",
  },
  setBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setText: { fontSize: 11, fontWeight: "900", color: Colors.text },
  valText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
});
