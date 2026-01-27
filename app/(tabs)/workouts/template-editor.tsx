import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import { TemplateExercise, WorkoutTemplate } from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ExerciseAutocomplete from "../../../components/workout/ExerciseAutocomplete";

export default function TemplateEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Get ID if editing
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);

  useEffect(() => {
    if (id) {
      loadExistingTemplate(id as string);
    }
  }, [id]);

  const loadExistingTemplate = async (templateId: string) => {
    const template = await WorkoutRepository.getTemplateById(templateId);
    if (template) {
      setName(template.name);
      setExercises(template.exercises);
    }
  };

  const addExercise = () => {
    const newEx: TemplateExercise = {
      id: Date.now().toString(),
      name: "",
      targetSets: "3",
      targetReps: "8-12",
      restTime: "60s",
      notes: "",
    };
    setExercises([...exercises, newEx]);
  };

  const updateExercise = (
    id: string,
    field: keyof TemplateExercise,
    value: string,
  ) => {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please name your workout routine.");
      return;
    }
    if (exercises.length === 0) {
      Alert.alert("Empty Routine", "Please add at least one exercise.");
      return;
    }

    const template: WorkoutTemplate = {
      id: (id as string) || Date.now().toString(),
      name,
      exercises,
    };

    await WorkoutRepository.saveTemplate(template);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {id ? "Edit Routine" : "New Routine"}
          </Text>
          <TouchableOpacity onPress={save}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* CRITICAL CHANGE: 
           keyboardShouldPersistTaps="handled" ensures clicks on the 
           autocomplete suggestions register before the keyboard dismisses 
        */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Routine Name</Text>
            <TextInput
              style={styles.mainInput}
              placeholder="e.g. Pull Day"
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.sectionTitle}>Exercises</Text>

          {exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.exerciseIndex}>#{index + 1}</Text>
                <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                  <Ionicons name="close-circle" size={24} color="#ddd" />
                </TouchableOpacity>
              </View>

              {/* REPLACED TextInput WITH AUTOCOMPLETE */}
              <View style={{ zIndex: 100 - index, marginBottom: 12 }}>
                {/* zIndex hack: ensures top dropdown covers items below it */}
                <ExerciseAutocomplete
                  style={styles.exerciseNameInput}
                  placeholder="Exercise Name (e.g. Bench Press)"
                  value={ex.name}
                  onChangeText={(v) => updateExercise(ex.id, "name", v)}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>Sets</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="3"
                    keyboardType="numeric"
                    value={ex.targetSets}
                    onChangeText={(v) => updateExercise(ex.id, "targetSets", v)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>Target Reps</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="8-12"
                    value={ex.targetReps}
                    onChangeText={(v) => updateExercise(ex.id, "targetReps", v)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>Rest Time</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="60s"
                    value={ex.restTime}
                    onChangeText={(v) => updateExercise(ex.id, "restTime", v)}
                  />
                </View>
              </View>

              <TextInput
                style={styles.notesInput}
                placeholder="Notes (e.g. Dropset last set)"
                value={ex.notes}
                onChangeText={(v) => updateExercise(ex.id, "notes", v)}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addExercise}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add Exercise</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
    paddingTop: 20,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  saveBtn: { color: Colors.primary, fontSize: 17, fontWeight: "600" },
  cancelBtn: { color: "#007AFF", fontSize: 17 },
  content: { padding: 16 },

  inputGroup: { marginBottom: 24 },
  label: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  mainInput: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 17,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: Colors.text,
  },

  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  exerciseIndex: { fontWeight: "bold", color: "#ccc" },

  // Update this to look good within the autocomplete container
  exerciseNameInput: {
    fontSize: 18,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
    backgroundColor: "transparent",
  },

  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  col: { flex: 1 },
  subLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  smallInput: {
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 8,
    fontSize: 16,
    textAlign: "center",
  },
  notesInput: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    fontStyle: "italic",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  addBtnText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});
