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
  Switch, // <--- Import Switch
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import { TemplateExercise, WorkoutTemplate } from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import ExerciseAutocomplete from "../../../components/workout/ExerciseAutocomplete";

export default function TemplateEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);

  // 1. NEW: Public State
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (id) loadExistingTemplate(id as string);
  }, [id]);

  const loadExistingTemplate = async (templateId: string) => {
    const template = await WorkoutRepository.getTemplateById(templateId);
    if (template) {
      setName(template.name);
      setExercises(template.exercises);
      // 2. LOAD: Set state from existing data
      setIsPublic(template.isPublic || false);
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
    if (!name.trim())
      return Alert.alert("MISSING NAME", "Please name your routine.");
    if (exercises.length === 0)
      return Alert.alert("EMPTY ROUTINE", "Add at least one exercise.");

    const template: WorkoutTemplate = {
      id: (id as string) || Date.now().toString(),
      name,
      exercises,
      isPublic, // 3. SAVE: Pass the boolean
    };

    await WorkoutRepository.saveTemplate(template);
    router.back();
  };

  return (
    <View style={styles.modalWrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>CANCEL</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {id ? "EDIT ROUTINE" : "NEW ROUTINE"}
          </Text>
          <TouchableOpacity onPress={save} style={styles.saveBtnContainer}>
            <Text style={styles.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ROUTINE NAME INPUT */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ROUTINE NAME</Text>
            <View style={styles.mainInputWrapper}>
              <TextInput
                style={styles.mainInput}
                placeholder="e.g. Pull Day"
                placeholderTextColor={Colors.placeholder}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* 4. PUBLIC TOGGLE UI */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleInfo}>
              <View
                style={[
                  styles.iconBox,
                  isPublic ? styles.iconPublic : styles.iconPrivate,
                ]}
              >
                <Ionicons
                  name={isPublic ? "earth" : "lock-closed"}
                  size={20}
                  color={isPublic ? Colors.white : Colors.textMuted}
                />
              </View>
              <View>
                <Text style={styles.toggleTitle}>
                  {isPublic ? "Public Routine" : "Private Routine"}
                </Text>
                <Text style={styles.toggleSub}>
                  {isPublic
                    ? "Anyone can see and copy this."
                    : "Only visible to you."}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              // On iOS the background color for 'false' is set via this prop:
              ios_backgroundColor={Colors.border}
            />
          </View>

          <Text style={styles.sectionTitle}>EXERCISES</Text>

          {exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.indexBadge}>
                  <Text style={styles.exerciseIndex}>{index + 1}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeExercise(ex.id)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>

              <View style={{ zIndex: 100 - index, marginBottom: 12 }}>
                <ExerciseAutocomplete
                  style={styles.exerciseNameInput}
                  placeholder="What's the exercise?"
                  value={ex.name}
                  onChangeText={(v) => updateExercise(ex.id, "name", v)}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>SETS</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="3"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.placeholder}
                    value={ex.targetSets}
                    onChangeText={(v) => updateExercise(ex.id, "targetSets", v)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>REPS</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="8-12"
                    placeholderTextColor={Colors.placeholder}
                    value={ex.targetReps}
                    onChangeText={(v) => updateExercise(ex.id, "targetReps", v)}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>REST</Text>
                  <TextInput
                    style={styles.smallInput}
                    placeholder="60s"
                    placeholderTextColor={Colors.placeholder}
                    value={ex.restTime}
                    onChangeText={(v) => updateExercise(ex.id, "restTime", v)}
                  />
                </View>
              </View>

              <TextInput
                style={styles.notesInput}
                placeholder="Add session tips..."
                placeholderTextColor={Colors.placeholder}
                value={ex.notes}
                onChangeText={(v) => updateExercise(ex.id, "notes", v)}
              />
            </View>
          ))}

          {/* ADD EXERCISE BUTTON */}
          <TouchableOpacity style={styles.addBtn} onPress={addExercise}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addBtnText}>ADD EXERCISE</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Existing Styles) ...
  modalWrapper: { flex: 1, backgroundColor: Colors.background, paddingTop: 10 },
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
  },
  cancelBtn: { fontSize: 13, fontWeight: "800", color: Colors.textMuted },
  saveBtnContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#46a302",
  },
  saveBtnText: { color: Colors.white, fontWeight: "900", fontSize: 13 },

  content: { padding: 16 },

  inputGroup: { marginBottom: 24 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  mainInputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  mainInput: {
    padding: 14,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },

  // 5. NEW STYLES FOR TOGGLE
  toggleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  iconPublic: { backgroundColor: Colors.primary, borderColor: "#46a302" },
  iconPrivate: { backgroundColor: Colors.background },
  toggleTitle: { fontSize: 15, fontWeight: "900", color: Colors.text },
  toggleSub: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 12,
    letterSpacing: 1,
  },

  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  indexBadge: {
    backgroundColor: Colors.background,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseIndex: { fontWeight: "900", color: Colors.text, fontSize: 14 },
  removeBtn: { padding: 4 },

  exerciseNameInput: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },

  row: { flexDirection: "row", gap: 10, marginBottom: 15 },
  col: { flex: 1 },
  subLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.placeholder,
    marginBottom: 4,
    textAlign: "center",
  },
  smallInput: {
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesInput: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    marginTop: 8,
  },
  addBtnText: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});
