import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Alert,
  Platform,
  UIManager,
  InteractionManager, // <--- 1. Import InteractionManager
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { ExerciseNote, WorkoutSet } from "../constants/types";
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
    startTime,
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
  // 2. Use Ref for synchronous access inside event listeners
  const isExitingRef = useRef(false);

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
  }, [exercises.length]);

  // 3. Optimized Navigation Listener
  useEffect(() => {
    const removeListener = navigation.addListener("beforeRemove", (e) => {
      // Check the ref immediately. If true, let navigation happen.
      if (isExitingRef.current) return;

      e.preventDefault();
      Alert.alert(
        "MISSION IN PROGRESS",
        "Don't quit now! Use the End Workout button to save your gains.",
        [{ text: "RESUME" }],
      );
    });
    return removeListener;
  }, [navigation]);

  // --- ACTIONS WRAPPED IN USECALLBACK ---

  const handleToggleExercise = useCallback((exId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedExerciseId((prev) => (prev === exId ? null : exId));
  }, []);

  const handleSetExpand = useCallback((setId: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSetId(setId);
  }, []);

  const handleUpdateSet = useCallback(
    (exId: string, setId: string, field: keyof WorkoutSet, value: any) => {
      setHighlightedSets((prev) => {
        if (prev.has(setId)) {
          const next = new Set(prev);
          next.delete(setId);
          return next;
        }
        return prev;
      });
      updateSet(exId, setId, field, value);
    },
    [updateSet],
  );

  const handleAddSet = useCallback(
    (exId: string) => {
      addSet(exId);
    },
    [addSet],
  );

  const handleRemoveSet = useCallback(
    (exId: string, setId: string) => {
      removeSet(exId, setId);
    },
    [removeSet],
  );

  const handleOpenNotes = useCallback(async (exName: string) => {
    setCurrentNoteExercise(exName);
    const notes = await WorkoutRepository.getNotes(exName);
    setNotesList(notes);
    setNotesModalVisible(true);
  }, []);

  const handleStartRestTimer = useCallback(
    (duration: number, setId: string, exId: string) => {
      setTimerDuration(duration);
      setActiveSetForTimer({ exId, setId });
      setTimerVisible(true);
    },
    [],
  );

  // 2. & 3. SMART VALIDATION & AUTO-ADVANCE LOGIC
  const handleSetDone = useCallback(
    (exerciseId: string, setId: string) => {
      const exerciseIndex = exercises.findIndex((e) => e.id === exerciseId);
      if (exerciseIndex === -1) return;

      const exercise = exercises[exerciseIndex];
      const set = exercise.sets.find((s) => s.id === setId);
      if (!set) return;

      const isInvalid = !set.reps || set.reps === "0";
      const isAlreadyHighlighted = highlightedSets.has(setId);

      // Validation Check
      if (isInvalid && !isAlreadyHighlighted) {
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
          if (nextExercise.sets.length > 0) {
            setExpandedSetId(nextExercise.sets[0].id);
          }
        } else {
          // Last Exercise Complete: Open Controls
          setControlsExpandTrigger(Date.now());
        }
      }
    },
    [exercises, highlightedSets, markSetComplete],
  );

  // --- OPTIMIZED SAVE & CANCEL HANDLERS ---

  const performSave = useCallback(() => {
    // 1. Synchronously flag exit (unblocks navigation)
    isExitingRef.current = true;
    setIsExiting(true);

    // 2. Start Animation IMMEDIATELY
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }

    // 3. Defer Heavy Logic (DB Writes) until animation completes
    InteractionManager.runAfterInteractions(async () => {
      try {
        await saveSession();
      } catch (e) {
        console.error("Failed to save session in background", e);
      }
    });
  }, [saveSession, router]);

  const handleFinish = useCallback(async () => {
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
  }, [exercises, performSave]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "ABANDON MISSION?",
      "All progress in this session will be lost forever!",
      [
        { text: "RESUME", style: "cancel" },
        {
          text: "ABANDON",
          style: "destructive",
          onPress: () => {
            // 1. Flag Exit
            isExitingRef.current = true;
            setIsExiting(true);

            // 2. Navigate Immediately
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }

            // 3. Clean up storage in background
            InteractionManager.runAfterInteractions(() => {
              cancelSession();
            });
          },
        },
      ],
    );
  }, [cancelSession, router]);

  const handleMinimize = useCallback(() => {
    // Just navigation, but good to keep consistent
    isExitingRef.current = true;
    setIsExiting(true);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, [router]);

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
            onToggle={() => handleToggleExercise(exercise.id)}
            onSetExpand={handleSetExpand}
            onUpdateSet={(setId, field, value) =>
              handleUpdateSet(exercise.id, setId, field as any, value)
            }
            onAddSet={() => handleAddSet(exercise.id)}
            onRemoveSet={(setId) => handleRemoveSet(exercise.id, setId)}
            onOpenNotes={() => handleOpenNotes(exercise.name)}
            onStartRestTimer={(dur, setId) =>
              handleStartRestTimer(dur, setId, exercise.id)
            }
            onSetDone={(setId) => handleSetDone(exercise.id, setId)}
          />
        ))}
        <View style={{ height: 180 }} />
      </ScrollView>

      <ActiveWorkoutControls
        elapsedSeconds={elapsedSeconds}
        startTime={startTime}
        isPaused={isPaused}
        autoExpandTrigger={controlsExpandTrigger}
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
