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

  const [isExiting, setIsExiting] = useState(false);

  // Track sets that should be highlighted red (errors/warnings)
  const [highlightedSets, setHighlightedSets] = useState<Set<string>>(
    new Set(),
  );

  // --- FIX 1: Prevent "Zombie" Workouts ---
  useEffect(() => {
    if (!isActive && !sessionId && !isExiting) {
      startWorkout(templateId);
    }
  }, [isActive, sessionId, templateId, isExiting]);

  // --- FIX 2: Block Back Button / Swipe ---
  useEffect(() => {
    const removeListener = navigation.addListener("beforeRemove", (e) => {
      if (isExiting) return;
      e.preventDefault();
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

  // Helper: Find all sets that are "empty" (no reps)
  const validateSets = () => {
    const invalidIds = new Set<string>();
    exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        // Condition: Reps are missing or "0".
        // We allow empty weight (bodyweight), but usually reps are required.
        if (!set.reps || set.reps === "0") {
          invalidIds.add(set.id);
        }
      });
    });
    return invalidIds;
  };

  const handleFinish = async () => {
    // 1. Check for empty sets (reps = 0 or empty)
    const invalidIds = validateSets();

    if (invalidIds.size > 0) {
      // Highlight them immediately
      setHighlightedSets(invalidIds);

      // Force expand the first exercise with an error (optional UX improvement)
      // const firstInvalidEx = exercises.find(ex => ex.sets.some(s => invalidIds.has(s.id)));
      // if (firstInvalidEx) setExpandedExerciseId(firstInvalidEx.id);

      Alert.alert(
        "Incomplete Sets",
        "Some sets have no reps recorded. Finish anyway?",
        [
          { text: "Resume", style: "cancel" },
          { text: "Finish", style: "default", onPress: performSave },
        ],
      );
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    setIsExiting(true);
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
          setIsExiting(true);
          await cancelSession();
          if (router.canDismiss()) router.dismiss();
          router.replace("/");
        },
      },
    ]);
  };

  const handleMinimize = () => {
    setIsExiting(true);
    if (router.canDismiss()) router.dismiss();
    router.replace("/");
  };

  // Logic: "Warn once, allow twice"
  const checkAndWarnAction = (
    exId: string,
    setId: string,
    action: () => void,
  ) => {
    const ex = exercises.find((e) => e.id === exId);
    const set = ex?.sets.find((s) => s.id === setId);

    if (!set) return;

    const isEmpty = !set.reps || set.reps === "0";

    // If empty AND not already highlighted -> Warn (Highlight) & Block
    if (isEmpty && !highlightedSets.has(setId)) {
      setHighlightedSets((prev) => new Set(prev).add(setId));
      return;
    }

    // Otherwise (Valid OR already warned) -> Proceed
    action();

    // Clear warning if it was fixed
    if (!isEmpty && highlightedSets.has(setId)) {
      setHighlightedSets((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
    }
  };

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
            highlightedSets={highlightedSets} // <--- Pass State
            onToggle={() => toggleAccordion(exercise.id)}
            onSetExpand={(setId) => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setExpandedSetId(setId);
            }}
            onUpdateSet={(setId, field, value) => {
              // Clear error as user types
              if (highlightedSets.has(setId)) {
                const next = new Set(highlightedSets);
                next.delete(setId);
                setHighlightedSets(next);
              }
              updateSet(exercise.id, setId, field as any, value);
            }}
            onAddSet={() => addSet(exercise.id)}
            onRemoveSet={(setId) => removeSet(exercise.id, setId)}
            onOpenNotes={() => openNotes(exercise.name)}
            onStartRestTimer={(dur, setId) => {
              // Wrap with check logic
              checkAndWarnAction(exercise.id, setId, () => {
                setTimerDuration(dur);
                setActiveSetForTimer({ exId: exercise.id, setId });
                setTimerVisible(true);
              });
            }}
            onSetDone={(setId) => {
              // Wrap with check logic
              checkAndWarnAction(exercise.id, setId, () => {
                markSetComplete(exercise.id, setId);
                advanceToNextSet(exercise.id, setId);
              });
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
      {/* ... NotesModal and RestTimerModal (unchanged) ... */}
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
