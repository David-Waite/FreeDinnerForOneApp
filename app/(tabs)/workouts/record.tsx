import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Colors from "../../../constants/Colors";
import { useWorkoutSession } from "../../../hooks/useWorkoutSession";
import { ExerciseNote } from "../../../constants/types";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import ExerciseCard from "../../../components/workout/ExerciseCard";
import NotesModal from "../../../components/workout/NotesModal";
import RestTimerModal from "../../../components/workout/RestTimerModal";

export default function RecordWorkoutScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();

  const {
    sessionName,
    startTime,
    exercises,
    updateSet,
    markSetComplete,
    addSet,
    removeSet,
    finishWorkout,
    sessionId,
  } = useWorkoutSession(templateId);

  // --- STATE ---
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null); // Lifted state
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentNoteExercise, setCurrentNoteExercise] = useState<string>("");
  const [notesList, setNotesList] = useState<ExerciseNote[]>([]);

  // Timer State
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [activeSetForTimer, setActiveSetForTimer] = useState<{
    exId: string;
    setId: string;
  } | null>(null);

  // --- LOGIC ---

  // 1. Logic to Advance to Next Set
  const advanceToNextSet = (exId: string, currentSetId: string) => {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;

    const currentIndex = ex.sets.findIndex((s) => s.id === currentSetId);
    // Is there a next set?
    if (currentIndex >= 0 && currentIndex < ex.sets.length - 1) {
      const nextSet = ex.sets[currentIndex + 1];
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSetId(nextSet.id);
    } else {
      // No more sets, close the current one
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSetId(null);
    }
  };

  // 2. Handle Exercise Accordion (Auto-open first incomplete)
  const toggleAccordion = (exId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedExerciseId === exId) {
      // Closing
      setExpandedExerciseId(null);
      setExpandedSetId(null);
    } else {
      // Opening
      setExpandedExerciseId(exId);
      // Find first incomplete set to open automatically
      const ex = exercises.find((e) => e.id === exId);
      if (ex) {
        const firstIncomplete = ex.sets.find((s) => !s.completed);
        const targetSet = firstIncomplete
          ? firstIncomplete.id
          : ex.sets.length > 0
            ? ex.sets[0].id
            : null;
        setExpandedSetId(targetSet);
      }
    }
  };

  // 3. Handle Manual "Done" Button
  const handleSetDone = (exId: string, setId: string) => {
    markSetComplete(exId, setId);
    advanceToNextSet(exId, setId);
  };

  // 4. Handle Timer Start
  const handleStartTimer = (duration: number, exId: string, setId: string) => {
    setTimerDuration(duration);
    setActiveSetForTimer({ exId, setId });
    setTimerVisible(true);
  };

  // 5. Handle Timer Complete (Auto-advance)
  const handleTimerComplete = () => {
    setTimerVisible(false);
    if (activeSetForTimer) {
      markSetComplete(activeSetForTimer.exId, activeSetForTimer.setId);
      advanceToNextSet(activeSetForTimer.exId, activeSetForTimer.setId);
      setActiveSetForTimer(null);
    }
  };

  // --- NOTES HANDLERS ---
  const openNotes = async (exerciseName: string) => {
    setCurrentNoteExercise(exerciseName);
    const data = await WorkoutRepository.getNotes(exerciseName);
    setNotesList(data);
    setNotesModalVisible(true);
  };

  const handleSaveNote = async (text: string) => {
    await WorkoutRepository.addNote(currentNoteExercise, text, sessionId);
    const data = await WorkoutRepository.getNotes(currentNoteExercise);
    setNotesList(data);
  };

  const handleTogglePin = async (noteId: string) => {
    await WorkoutRepository.togglePinNote(currentNoteExercise, noteId);
    const data = await WorkoutRepository.getNotes(currentNoteExercise);
    setNotesList(data);
  };

  const handleDeleteNote = async (noteId: string) => {
    await WorkoutRepository.deleteNote(currentNoteExercise, noteId);
    const data = await WorkoutRepository.getNotes(currentNoteExercise);
    setNotesList(data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{sessionName}</Text>
          <Text style={styles.headerSubtitle}>
            {startTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <TouchableOpacity style={styles.finishBtn} onPress={finishWorkout}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            isExpanded={expandedExerciseId === exercise.id}
            expandedSetId={expandedSetId}
            onToggle={() => toggleAccordion(exercise.id)}
            onSetExpand={(setId) => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setExpandedSetId(setId);
            }}
            onUpdateSet={(setId, field, value) =>
              updateSet(exercise.id, setId, field as any, value)
            }
            onAddSet={() => addSet(exercise.id)}
            onRemoveSet={(setId) => removeSet(exercise.id, setId)}
            onOpenNotes={() => openNotes(exercise.name)}
            onStartRestTimer={(duration, setId) =>
              handleStartTimer(duration, exercise.id, setId)
            }
            onSetDone={(setId) => handleSetDone(exercise.id, setId)}
          />
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODALS */}
      <NotesModal
        visible={notesModalVisible}
        onClose={() => setNotesModalVisible(false)}
        exerciseName={currentNoteExercise}
        notes={notesList}
        onSaveNote={handleSaveNote}
        onTogglePin={handleTogglePin}
        onDeleteNote={handleDeleteNote} // <--- Pass the function
      />

      <RestTimerModal
        visible={timerVisible}
        seconds={timerDuration}
        onClose={() => setTimerVisible(false)}
        onComplete={handleTimerComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  headerSubtitle: { fontSize: 14, color: "#888", marginTop: 2 },
  finishBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  finishBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  scrollContent: { padding: 16 },
});
