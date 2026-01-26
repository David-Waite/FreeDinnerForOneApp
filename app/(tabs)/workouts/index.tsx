import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import {
  WorkoutSession,
  NotesStorage,
  ExerciseNote,
} from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";
import HistoryWorkoutCard from "../../../components/workout/HistoryWorkoutCard";
import { Swipeable } from "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [allNotes, setAllNotes] = useState<NotesStorage>({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [viewingNotes, setViewingNotes] = useState<ExerciseNote[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const [workouts, notes] = await Promise.all([
      WorkoutRepository.getWorkouts(),
      WorkoutRepository.getAllNotes(),
    ]);
    setHistory(workouts);
    setAllNotes(notes);
  };

  const deleteWorkout = async (id: string) => {
    await WorkoutRepository.deleteWorkout(id);
    loadData();
  };

  const deleteHistoryNote = async (note: ExerciseNote) => {
    if (note.exerciseName) {
      await WorkoutRepository.deleteNote(note.exerciseName, note.id);
      loadData();
      setNotesModalVisible(false);
    }
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    history.forEach((session) => {
      const dateKey = session.date.split("T")[0];
      marks[dateKey] = { marked: true, dotColor: Colors.primary };
    });
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.primary,
      disableTouchEvent: true,
    };
    return marks;
  }, [history, selectedDate]);

  const dayWorkouts = useMemo(() => {
    return history.filter((s) => s.date.startsWith(selectedDate));
  }, [history, selectedDate]);

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleViewNotes = (notes: ExerciseNote[]) => {
    setViewingNotes(notes);
    setNotesModalVisible(true);
  };

  // --- 1. RENDER FUNCTION FOR WORKOUT CARD SWIPE ---
  const renderRightActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.deleteAction}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={30} color="#fff" />
        </Animated.View>
      </View>
    );
  };

  // --- 2. RENDER FUNCTION FOR NOTE SWIPE ---
  const renderNoteRightActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <View style={styles.noteDeleteAction}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={24} color="#fff" />
        </Animated.View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={{
            todayTextColor: Colors.primary,
            arrowColor: Colors.primary,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: "#ffffff",
            textDayFontWeight: "600",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "600",
          }}
        />
      </View>
      <Text style={styles.sectionTitle}>
        {new Date(selectedDate).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dayWorkouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <Swipeable
              renderRightActions={renderRightActions}
              rightThreshold={SCREEN_WIDTH * 0.4}
              onSwipeableOpen={() => deleteWorkout(item.id)}
            >
              <HistoryWorkoutCard
                workout={item}
                defaultExpanded={dayWorkouts.length === 1}
                allNotes={allNotes}
                onViewNotes={handleViewNotes}
              />
            </Swipeable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workouts recorded.</Text>
            <Text style={styles.emptySubText}>
              Rest days are important too!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/workouts/new")}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Record Workout</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={notesModalVisible}
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Session Notes</Text>
            <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }}>
            {viewingNotes.map((note) => (
              <Swipeable
                key={note.id}
                renderRightActions={renderNoteRightActions}
                onSwipeableOpen={() => deleteHistoryNote(note)}
              >
                <View style={styles.noteCard}>
                  <Text style={styles.noteTitle}>{note.exerciseName}</Text>
                  <Text style={styles.noteText}>{note.text}</Text>
                  <Text style={styles.noteTime}>
                    {new Date(note.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </Swipeable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  calendarContainer: {
    backgroundColor: "#fff",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  itemWrapper: { paddingHorizontal: 16 },

  // Style for WORKOUT delete
  deleteAction: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },

  // Style for NOTE delete
  noteDeleteAction: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 12,
    borderRadius: 12,
    flex: 1,
    paddingRight: 20,
  },

  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#888" },
  emptySubText: { fontSize: 14, color: "#aaa", marginTop: 4 },

  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: { color: "#fff", fontWeight: "bold", marginLeft: 8, fontSize: 16 },

  modalContainer: { flex: 1, backgroundColor: "#f2f2f7" },
  modalHeader: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalClose: { color: Colors.primary, fontSize: 16, fontWeight: "600" },

  noteCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  noteText: { fontSize: 16, color: "#333", marginBottom: 4 },
  noteTime: { fontSize: 12, color: "#999", alignSelf: "flex-end" },
});
