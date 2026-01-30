import React, { useMemo, useState, useEffect } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context"; // IMPORT
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
  const insets = useSafeAreaInsets(); // HOOK
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
    router.replace("/");
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
            router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Manual SafeArea using padding to avoid clipping */}
      <View style={[styles.topSafeArea, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>CURRENT MISSION</Text>
          <Text style={styles.headerTitle}>{sessionName?.toUpperCase()}</Text>

          {/* Duo-style Progress Bar */}
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
            onSetDone={(setId) => {
              markSetComplete(exercise.id, setId);
              const idx = exercise.sets.findIndex((s) => s.id === setId);
              if (idx < exercise.sets.length - 1) {
                setExpandedSetId(exercise.sets[idx + 1].id);
              }
            }}
          />
        ))}
        <View style={{ height: 180 }} />
      </ScrollView>

      <ActiveWorkoutControls
        elapsedSeconds={elapsedSeconds}
        isPaused={isPaused}
        onPauseToggle={togglePause}
        onFinish={handleFinish}
        onCancel={handleCancel}
        onMinimize={() => {
          setIsExiting(true);
          router.replace("/");
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
            markSetComplete(activeSetForTimer.exId, activeSetForTimer.setId);
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
    // No edges or SafeAreaView here, manual padding handled in JSX
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
