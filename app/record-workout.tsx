import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { ExerciseNote } from "../constants/types";
import { useWorkoutContext } from "../context/WorkoutContext";
import NotesModal from "../components/workout/NotesModal";
import RestTimerModal from "../components/workout/RestTimerModal";
import ExerciseCard from "../components/workout/ExerciseCard";
import ActiveWorkoutControls from "../components/workout/ActiveWorkoutControls";

export default function RecordWorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();

  const {
    isActive,
    startWorkout,
    sessionId,
    sessionName,
    exercises,
    elapsedSeconds,
    isPaused,
    togglePause,
    hasUnsavedChanges,
    hasIncompleteData,
    updateSet,
    markSetComplete,
    addSet,
    removeSet,
    saveSession,
    cancelSession,
  } = useWorkoutContext();

  // Renamed for clarity: tracks if we are intentionally leaving the screen
  const [isExiting, setIsExiting] = useState(false);

  // --- FIX 1: Prevent "Zombie" Workouts ---
  useEffect(() => {
    // Only auto-start if we are NOT currently trying to exit/save.
    // This prevents the effect from firing immediately after we clear the session.
    if (!isActive && !sessionId && !isExiting) {
      startWorkout(templateId);
    }
  }, [isActive, sessionId, templateId, isExiting]);

  // --- FIX 2: Block Back Button / Swipe ---
  useEffect(() => {
    const removeListener = navigation.addListener("beforeRemove", (e) => {
      if (isExiting) {
        // We initiated this navigation (Finish, Cancel, or Minimize), so allow it.
        return;
      }

      // Block hardware back button & gestures
      e.preventDefault();

      // Optional: Tell the user why back is blocked
      Alert.alert(
        "Workout in Progress",
        "Please use the Minimize (Home) button or End Workout button.",
        [{ text: "OK" }],
      );
    });
    return removeListener;
  }, [navigation, isExiting]);

  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentNoteExercise, setCurrentNoteExercise] = useState<string>("");
  const [notesList, setNotesList] = useState<ExerciseNote[]>([]);
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [activeSetForTimer, setActiveSetForTimer] = useState<{
    exId: string;
    setId: string;
  } | null>(null);

  const handleFinish = async () => {
    if (hasIncompleteData) {
      Alert.alert("Finish Workout?", "Incomplete sets. Finish anyway?", [
        { text: "Resume", style: "cancel" },
        { text: "Finish", style: "default", onPress: performSave },
      ]);
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    setIsExiting(true); // Flag prevents the useEffect from restarting a workout
    await saveSession();
    if (router.canDismiss()) router.dismiss();
    router.replace("/");
  };

  const handleCancel = () => {
    Alert.alert("Cancel Workout?", "Progress will be lost.", [
      {
        text: "Resume",
        style: "cancel",
        onPress: () => {
          if (isPaused) togglePause();
        },
      },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          setIsExiting(true); // Flag prevents restart
          await cancelSession();
          if (router.canDismiss()) router.dismiss();
          router.replace("/");
        },
      },
    ]);
  };

  const handleMinimize = () => {
    setIsExiting(true); // Flag allows navigation through the listener
    // We do NOT cancel/save here, we just leave.
    if (router.canDismiss()) router.dismiss();
    router.replace("/");
  };

  // ... (Rest of the component logic remains the same: expand/collapse, etc.) ...

  const advanceToNextSet = (exId: string, currentSetId: string) => {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    const idx = ex.sets.findIndex((s) => s.id === currentSetId);
    if (idx >= 0 && idx < ex.sets.length - 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedSetId(ex.sets[idx + 1].id);
    } else {
      setExpandedSetId(null);
    }
  };

  const toggleAccordion = (exId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedExerciseId === exId) {
      setExpandedExerciseId(null);
      setExpandedSetId(null);
    } else {
      setExpandedExerciseId(exId);
      const ex = exercises.find((e) => e.id === exId);
      if (ex)
        setExpandedSetId(
          ex.sets.find((s) => !s.completed)?.id || ex.sets[0]?.id || null,
        );
    }
  };

  const openNotes = async (name: string) => {
    setCurrentNoteExercise(name);
    setNotesList(await WorkoutRepository.getNotes(name));
    setNotesModalVisible(true);
  };
  const handleSaveNote = async (text: string) => {
    await WorkoutRepository.addNote(
      currentNoteExercise,
      text,
      sessionId || undefined,
    );
    setNotesList(await WorkoutRepository.getNotes(currentNoteExercise));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{sessionName}</Text>
        </View>
      </SafeAreaView>
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
            onStartRestTimer={(dur, setId) => {
              setTimerDuration(dur);
              setActiveSetForTimer({ exId: exercise.id, setId });
              setTimerVisible(true);
            }}
            onSetDone={(setId) => {
              markSetComplete(exercise.id, setId);
              advanceToNextSet(exercise.id, setId);
            }}
          />
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>
      <ActiveWorkoutControls
        elapsedSeconds={elapsedSeconds}
        isPaused={isPaused}
        onPauseToggle={togglePause}
        onFinish={handleFinish}
        onCancel={handleCancel}
        onMinimize={handleMinimize}
      />
      <NotesModal
        visible={notesModalVisible}
        onClose={() => setNotesModalVisible(false)}
        exerciseName={currentNoteExercise}
        notes={notesList}
        onSaveNote={handleSaveNote}
        onTogglePin={async (id) => {
          await WorkoutRepository.togglePinNote(currentNoteExercise, id);
          setNotesList(await WorkoutRepository.getNotes(currentNoteExercise));
        }}
        onDeleteNote={async (id) => {
          await WorkoutRepository.deleteNote(currentNoteExercise, id);
          setNotesList(await WorkoutRepository.getNotes(currentNoteExercise));
        }}
      />
      <RestTimerModal
        visible={timerVisible}
        seconds={timerDuration}
        onClose={() => setTimerVisible(false)}
        onComplete={() => {
          setTimerVisible(false);
          if (activeSetForTimer) {
            markSetComplete(activeSetForTimer.exId, activeSetForTimer.setId);
            advanceToNextSet(activeSetForTimer.exId, activeSetForTimer.setId);
            setActiveSetForTimer(null);
          }
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  topSafeArea: { backgroundColor: "#fff" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  scrollContent: { padding: 16 },
});
