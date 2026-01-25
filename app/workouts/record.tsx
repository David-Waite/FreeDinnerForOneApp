import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { Exercise, WorkoutSession } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import Colors from "../../constants/Colors";

export default function RecordWorkoutScreen() {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState("New Workout");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Add a new exercise block (e.g., "Bench")
  const addExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: "",
      sets: [
        {
          id: Date.now().toString() + "s",
          weight: 0,
          reps: 0,
          completed: false,
        },
      ],
    };
    setExercises([...exercises, newExercise]);
  };

  // Update exercise name
  const updateExerciseName = (id: string, text: string) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name: text } : e)),
    );
  };

  // Add a set to specific exercise
  const addSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        return {
          ...e,
          sets: [
            ...e.sets,
            { id: Date.now().toString(), weight: 0, reps: 0, completed: false },
          ],
        };
      }),
    );
  };

  // Update set values
  const updateSet = (
    exerciseId: string,
    setId: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e.id !== exerciseId) return e;
        return {
          ...e,
          sets: e.sets.map((s) =>
            s.id === setId ? { ...s, [field]: Number(value) } : s,
          ),
        };
      }),
    );
  };

  const saveWorkout = async () => {
    if (exercises.length === 0) {
      Alert.alert("Empty Workout", "Please add at least one exercise.");
      return;
    }

    const session: WorkoutSession = {
      id: Date.now().toString(),
      name: workoutName,
      date: new Date().toISOString(),
      exercises,
    };

    await WorkoutRepository.saveWorkout(session);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.workoutTitle}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Workout Name"
        />
        <TouchableOpacity onPress={saveWorkout}>
          <Text style={styles.saveBtn}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
        {exercises.map((ex, exIndex) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <TextInput
                style={styles.exerciseName}
                placeholder="Exercise Name (e.g. Bench)"
                value={ex.name}
                onChangeText={(text) => updateExerciseName(ex.id, text)}
              />
            </View>

            <View style={styles.setRowHeader}>
              <Text style={styles.colHead}>Set</Text>
              <Text style={styles.colHead}>kg</Text>
              <Text style={styles.colHead}>Reps</Text>
            </View>

            {ex.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <View style={styles.setBadge}>
                  <Text style={styles.setText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  onChangeText={(v) => updateSet(ex.id, set.id, "weight", v)}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  onChangeText={(v) => updateSet(ex.id, set.id, "reps", v)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSetBtn}
              onPress={() => addSet(ex.id)}
            >
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  workoutTitle: { fontSize: 24, fontWeight: "bold", flex: 1 },
  saveBtn: { fontSize: 18, color: Colors.primary, fontWeight: "600" },
  scroll: { padding: 16 },

  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseHeader: { marginBottom: 12 },
  exerciseName: {
    fontSize: 20,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },

  setRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  colHead: {
    fontWeight: "bold",
    color: "#888",
    width: 60,
    textAlign: "center",
  },

  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  setBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  setText: { fontWeight: "bold", color: "#555" },
  input: {
    backgroundColor: "#f0f2f5",
    borderRadius: 8,
    width: 80,
    height: 40,
    textAlign: "center",
    fontSize: 16,
  },

  addSetBtn: { alignSelf: "center", marginTop: 8, padding: 8 },
  addSetText: { color: Colors.primary, fontWeight: "600" },

  addExerciseBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  addExerciseText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
