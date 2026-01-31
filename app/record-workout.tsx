import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Alert,
  Platform,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { ExerciseNote } from "../constants/types";
import { useWorkoutContext } from "../context/WorkoutContext";
import NotesModal from "../components/workout/NotesModal";
import RestTimerModal from "../components/workout/RestTimerModal";
import ExerciseCard from "../components/workout/ExerciseCard";
import ActiveWorkoutControls from "../components/workout/ActiveWorkoutControls";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RecordWorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    updateSet,
    markSetComplete,
    addSet,
    removeSet,
    saveSession,
    cancelSession,
  } = useWorkoutContext();

  const [isExiting, setIsExiting] = useState(false);
  const [highlightedSets, setHighlightedSets] = useState<Set<string>>(
    new Set(),
  );
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);

  // Trigger to open the bottom drawer
  const [controlsExpandTrigger, setControlsExpandTrigger] = useState<number>(0);

  // Modal states
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [currentNoteExercise, setCurrentNoteExercise] = useState<string>("");
  const [notesList, setNotesList] = useState<ExerciseNote[]>([]);
  const [timerVisible, setTimerVisible] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [activeSetForTimer, setActiveSetForTimer] = useState<{
    exId: string;
    setId: string;
  } | null>(null);

  const progress = useMemo(() => {
    const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0,
    );
    return totalSets > 0 ? completedSets / totalSets : 0;
  }, [exercises]);

  useEffect(() => {
    if (!isActive && !sessionId && !isExiting) startWorkout(templateId);
  }, [isActive, sessionId, templateId, isExiting]);

  // 1. AUTO-EXPAND FIRST EXERCISE
  useEffect(() => {
    if (exercises.length > 0 && expandedExerciseId === null) {
      setExpandedExerciseId(exercises[0].id);
    }
  }, [exercises.length]); // Run when exercises load

  useEffect(() => {
    const removeListener = navigation.addListener("beforeRemove", (e) => {
      if (isExiting) return;
      e.preventDefault();
      Alert.alert(
        "MISSION IN PROGRESS",
        "Don't quit now! Use the End Workout button to save your gains.",
        [{ text: "RESUME" }],
      );
    });
    return removeListener;
  }, [navigation, isExiting]);

  // 2. & 3. SMART VALIDATION & AUTO-ADVANCE LOGIC
  const handleSetDone = (exerciseId: string, setId: string) => {
    const exerciseIndex = exercises.findIndex((e) => e.id === exerciseId);
    if (exerciseIndex === -1) return;

    const exercise = exercises[exerciseIndex];
    const set = exercise.sets.find((s) => s.id === setId);
    if (!set) return;

    const isInvalid = !set.reps || set.reps === "0";
    const isAlreadyHighlighted = highlightedSets.has(setId);

    // Validation Check
    if (isInvalid && !isAlreadyHighlighted) {
      // First click with error: Highlight RED
      setHighlightedSets((prev) => new Set(prev).add(setId));
      return;
    }

    // Valid OR Second Click (Forced): Complete the set
    if (isAlreadyHighlighted) {
      setHighlightedSets((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
    }

    markSetComplete(exerciseId, setId);

    // Auto-Advance Logic
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    const isLastSet = setIndex === exercise.sets.length - 1;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (!isLastSet) {
      // Go to next set
      setExpandedSetId(exercise.sets[setIndex + 1].id);
    } else {
      // Exercise Complete
      if (exerciseIndex < exercises.length - 1) {
        // Open next exercise
        const nextExercise = exercises[exerciseIndex + 1];
        setExpandedExerciseId(nextExercise.id);
        // Optional: Expand first set of next exercise
        if (nextExercise.sets.length > 0) {
          setExpandedSetId(nextExercise.sets[0].id);
        }
      } else {
        // Last Exercise Complete: Open Controls
        setControlsExpandTrigger(Date.now());
      }
    }
  };

  const handleFinish = async () => {
    const invalidIds = new Set<string>();
    exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (!set.reps || set.reps === "0") invalidIds.add(set.id);
      });
    });

    if (invalidIds.size > 0) {
      setHighlightedSets(invalidIds);
      Alert.alert(
        "INCOMPLETE REPS",
        "Some sets are missing reps. Finish the mission anyway?",
        [
          { text: "STAY", style: "cancel" },
          { text: "FINISH", style: "default", onPress: performSave },
        ],
      );
    } else {
      performSave();
    }
  };

  const performSave = async () => {
    setIsExiting(true);
    await saveSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "ABANDON MISSION?",
      "All progress in this session will be lost forever!",
      [
        { text: "RESUME", style: "cancel" },
        {
          text: "ABANDON",
          style: "destructive",
          onPress: async () => {
            setIsExiting(true);
            await cancelSession();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)"); // Fallback if no history exists
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topSafeArea, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>CURRENT MISSION</Text>
          <Text style={styles.headerTitle}>{sessionName?.toUpperCase()}</Text>

          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            >
              <View style={styles.progressGlint} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            isExpanded={expandedExerciseId === exercise.id}
            expandedSetId={expandedSetId}
            highlightedSets={highlightedSets}
            onToggle={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setExpandedExerciseId(
                expandedExerciseId === exercise.id ? null : exercise.id,
              );
            }}
            onSetExpand={(setId) => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setExpandedSetId(setId);
            }}
            onUpdateSet={(setId, field, value) => {
              if (highlightedSets.has(setId)) {
                const next = new Set(highlightedSets);
                next.delete(setId);
                setHighlightedSets(next);
              }
              updateSet(exercise.id, setId, field as any, value);
            }}
            onAddSet={() => addSet(exercise.id)}
            onRemoveSet={(setId) => removeSet(exercise.id, setId)}
            onOpenNotes={async () => {
              setCurrentNoteExercise(exercise.name);
              setNotesList(await WorkoutRepository.getNotes(exercise.name));
              setNotesModalVisible(true);
            }}
            onStartRestTimer={(dur, setId) => {
              setTimerDuration(dur);
              setActiveSetForTimer({ exId: exercise.id, setId });
              setTimerVisible(true);
            }}
            onSetDone={(setId) => handleSetDone(exercise.id, setId)}
          />
        ))}
        <View style={{ height: 180 }} />
      </ScrollView>

      <ActiveWorkoutControls
        elapsedSeconds={elapsedSeconds}
        isPaused={isPaused}
        autoExpandTrigger={controlsExpandTrigger}
        onPauseToggle={togglePause}
        onFinish={handleFinish}
        onCancel={handleCancel}
        onMinimize={() => {
          setIsExiting(true);
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)"); // Fallback if no history exists
          }
        }}
      />

      <NotesModal
        visible={notesModalVisible}
        onClose={() => setNotesModalVisible(false)}
        exerciseName={currentNoteExercise}
        notes={notesList}
        onTogglePin={async (id) => {
          await WorkoutRepository.togglePinNote(currentNoteExercise, id);
          setNotesList(await WorkoutRepository.getNotes(currentNoteExercise));
        }}
        onDeleteNote={async (id) => {
          await WorkoutRepository.deleteNote(currentNoteExercise, id);
          setNotesList(await WorkoutRepository.getNotes(currentNoteExercise));
        }}
        onSaveNote={async (text) => {
          await WorkoutRepository.addNote(
            currentNoteExercise,
            text,
            sessionId || undefined,
          );
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
            handleSetDone(activeSetForTimer.exId, activeSetForTimer.setId);
            setActiveSetForTimer(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topSafeArea: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  header: {
    padding: 16,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 14,
    width: "90%",
    backgroundColor: Colors.border,
    borderRadius: 7,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: "center",
  },
  progressGlint: {
    height: 4,
    width: "90%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: -4,
  },
  scrollContent: { padding: 16 },
});
