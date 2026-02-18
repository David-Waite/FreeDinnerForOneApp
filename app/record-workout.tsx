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
  InteractionManager,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useLocalSearchParams,
  useRouter,
  useNavigation,
  useFocusEffect,
} from "expo-router";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { ExerciseNote, WorkoutSet } from "../constants/types";
import { useWorkoutContext } from "../context/WorkoutContext";
import NotesModal from "../components/workout/NotesModal";
import RestTimerModal from "../components/workout/RestTimerModal";
import ExerciseCard from "../components/workout/ExerciseCard";
import ActiveWorkoutControls from "../components/workout/ActiveWorkoutControls";
import { Ionicons } from "@expo/vector-icons";
import ExerciseAutocomplete from "../components/workout/ExerciseAutocomplete";
import DuoTouch from "../components/ui/DuoTouch";
import { TextInput } from "react-native-gesture-handler";

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
    addExerciseToSession,
    updateSet,
    markSetComplete,
    addSet,
    removeSet,
    saveSession,
    cancelSession,
    // Rest Timer Context
    restTimer,
    startRestTimer,
    cancelRestTimer,
    minimizeRestTimer,
    maximizeRestTimer,
    isRestTimerMinimized,
    addRestTime,
  } = useWorkoutContext();

  const [isExiting, setIsExiting] = useState(false);
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

  // Track if screen is focused (to control auto-advance behavior)
  const [isFocused, setIsFocused] = useState(false);

  // --- NEW STATE FOR ADDING EXERCISE ---
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("3");
  const [newExReps, setNewExReps] = useState("8-12"); // Visual only
  const [newExRest, setNewExRest] = useState("60");

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const handleConfirmAddExercise = async () => {
    if (!newExName.trim()) {
      Alert.alert("MISSING NAME", "Please choose an exercise.");
      return;
    }

    const sets = parseInt(newExSets) || 3;
    const rest = parseInt(newExRest) || 60;

    await addExerciseToSession(newExName, sets, rest);

    // Reset and close
    setIsAddingExercise(false);
    setNewExName("");
    setNewExSets("3");
    setNewExReps("8-12");
    setNewExRest("60");

    // Scroll to bottom (optional, but nice)
  };

  // --- AUTO-ADVANCE LOGIC ---
  const advanceToNextSet = useCallback(
    (currentExId: string, currentSetId: string) => {
      const exerciseIndex = exercises.findIndex((e) => e.id === currentExId);
      if (exerciseIndex === -1) return;

      const exercise = exercises[exerciseIndex];
      const setIndex = exercise.sets.findIndex((s) => s.id === currentSetId);
      if (setIndex === -1) return;

      const isLastSet = setIndex === exercise.sets.length - 1;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      if (!isLastSet) {
        setExpandedSetId(exercise.sets[setIndex + 1].id);
      } else {
        if (exerciseIndex < exercises.length - 1) {
          const nextExercise = exercises[exerciseIndex + 1];
          setExpandedExerciseId(nextExercise.id);
          if (nextExercise.sets.length > 0) {
            setExpandedSetId(nextExercise.sets[0].id);
          }
        } else {
          setControlsExpandTrigger(Date.now());
        }
      }
    },
    [exercises],
  );

  // --- EFFECT: HANDLE TIMER FINISH ---
  useEffect(() => {
    // If we are on this screen and the timer is finished, we MUST clean it up.
    if (isFocused && restTimer?.isFinished) {
      console.log("Timer finished while focused. Clearing and advancing.");

      // 1. Clear the timer (so it stops being "active")
      cancelRestTimer();

      // 2. Advance the UI
      advanceToNextSet(restTimer.exerciseId, restTimer.setId);
    }
  }, [isFocused, restTimer, cancelRestTimer, advanceToNextSet]);

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

  useEffect(() => {
    if (exercises.length > 0 && expandedExerciseId === null) {
      setExpandedExerciseId(exercises[0].id);
    }
  }, [exercises.length]);

  useEffect(() => {
    const removeListener = navigation.addListener("beforeRemove", (e) => {
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

  // --- ACTIONS ---

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
      const ex = exercises.find((e) => e.id === exId);
      const name = ex ? ex.name : "Exercise";
      startRestTimer(duration, exId, setId, name);
    },
    [startRestTimer, exercises],
  );

  const handleSetDone = useCallback(
    (exerciseId: string, setId: string) => {
      const exerciseIndex = exercises.findIndex((e) => e.id === exerciseId);
      if (exerciseIndex === -1) return;

      const exercise = exercises[exerciseIndex];
      const set = exercise.sets.find((s) => s.id === setId);
      if (!set) return;

      const isInvalid = !set.reps || set.reps === "0";
      const isAlreadyHighlighted = highlightedSets.has(setId);

      if (isInvalid && !isAlreadyHighlighted) {
        setHighlightedSets((prev) => new Set(prev).add(setId));
        return;
      }

      if (isAlreadyHighlighted) {
        setHighlightedSets((prev) => {
          const next = new Set(prev);
          next.delete(setId);
          return next;
        });
      }

      if (restTimer && restTimer.setId === setId) {
        cancelRestTimer();
      }

      markSetComplete(exerciseId, setId);
      advanceToNextSet(exerciseId, setId);
    },
    [
      exercises,
      highlightedSets,
      markSetComplete,
      restTimer,
      cancelRestTimer,
      advanceToNextSet,
    ],
  );

  const performSave = useCallback(() => {
    isExitingRef.current = true;
    setIsExiting(true);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
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
            isExitingRef.current = true;
            setIsExiting(true);
            cancelRestTimer();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
            InteractionManager.runAfterInteractions(() => {
              cancelSession();
            });
          },
        },
      ],
    );
  }, [cancelSession, router, cancelRestTimer]);

  const handleMinimize = useCallback(() => {
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
            activeRestTimer={restTimer}
            onOpenRestTimer={maximizeRestTimer}
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

        {/* --- ADD EXERCISE SECTION --- */}
        <View style={styles.addSection}>
          {!isAddingExercise ? (
            <DuoTouch
              style={styles.addBtn}
              onPress={() => setIsAddingExercise(true)}
            >
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
              <Text style={styles.addBtnText}>ADD EXERCISE</Text>
            </DuoTouch>
          ) : (
            <View style={styles.newExerciseCard}>
              <Text style={styles.newCardTitle}>NEW EXERCISE</Text>

              <View style={{ zIndex: 100, marginBottom: 16 }}>
                <ExerciseAutocomplete
                  placeholder="Search exercise..."
                  value={newExName}
                  onChangeText={setNewExName}
                  style={styles.exerciseNameInput}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>SETS</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={newExSets}
                    onChangeText={setNewExSets}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>REPS</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={newExReps}
                    onChangeText={setNewExReps}
                    // Reps is just a placeholder here, session doesn't store target reps strictly
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.subLabel}>REST (s)</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={newExRest}
                    onChangeText={setNewExRest}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelActionBtn}
                  onPress={() => setIsAddingExercise(false)}
                >
                  <Text style={styles.cancelActionText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmActionBtn}
                  onPress={handleConfirmAddExercise}
                >
                  <Text style={styles.confirmActionText}>CONFIRM</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 200 }} />
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
        // KEY CHANGE: If the timer is finished, FORCE HIDE the modal.
        // This prevents the "frozen screen" if the cleanup effect is slightly delayed.
        visible={!!restTimer && !isRestTimerMinimized && !restTimer.isFinished}
        endTime={restTimer?.endTime || 0}
        onMinimize={minimizeRestTimer}
        onCancel={cancelRestTimer}
        onAdd30={() => addRestTime(30)}
        onSkip={() => {
          if (restTimer) {
            handleSetDone(restTimer.exerciseId, restTimer.setId);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderStyle: "dashed",
  },
  addBtnText: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 1,
  },

  // Card Styles (Mimicking TemplateEditor)
  newExerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  newCardTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  exerciseNameInput: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 20 },
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

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelActionBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cancelActionText: {
    color: Colors.textMuted,
    fontWeight: "900",
    fontSize: 12,
  },
  confirmActionBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: "#46a302", // Darker green shade
  },
  confirmActionText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 12,
  },
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
