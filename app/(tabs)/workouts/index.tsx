import React, { useCallback, useState, useMemo, useRef } from "react";
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
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";
import { Swipeable } from "react-native-gesture-handler";

import { WorkoutRepository } from "../../../services/WorkoutRepository";
import {
  WorkoutSession,
  NotesStorage,
  ExerciseNote,
} from "../../../constants/types";
import Colors from "../../../constants/Colors";
import HistoryWorkoutCard from "../../../components/workout/HistoryWorkoutCard";
import { useWorkoutContext } from "../../../context/WorkoutContext";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const { isActive } = useWorkoutContext();

  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [allNotes, setAllNotes] = useState<NotesStorage>({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [viewingNotes, setViewingNotes] = useState<ExerciseNote[]>([]);

  // -- NEW: Body Weight Modal State --
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [currentWeight, setCurrentWeight] = useState("");

  const rowRefs = useRef<{ [key: string]: Swipeable | null }>({});

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
    const sorted = workouts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    setHistory(sorted);
    setAllNotes(notes);
  };

  const deleteWorkout = async (id: string) => {
    const linkedPost = await WorkoutRepository.getPostByWorkoutId(id);
    const message = linkedPost
      ? "This workout is linked to a social post. Deleting it will remove the content from your post. Are you sure?"
      : "Are you sure you want to remove this session?";

    Alert.alert("Delete Workout", message, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          const ref = rowRefs.current[id];
          if (ref) ref.close();
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await WorkoutRepository.deleteWorkout(id);
          loadData();
        },
      },
    ]);
  };

  const deleteHistoryNote = async (note: ExerciseNote) => {
    if (note.exerciseName) {
      await WorkoutRepository.deleteNote(note.exerciseName, note.id);
      loadData();
      setNotesModalVisible(false);
    }
  };

  // --- NEW: Handle Body Weight Save ---
  const handleSaveWeight = async () => {
    if (!currentWeight) return;
    const weightVal = parseFloat(currentWeight);
    if (isNaN(weightVal)) {
      Alert.alert("Invalid Input", "Please enter a valid number.");
      return;
    }

    // Save for the currently selected date in the calendar
    await WorkoutRepository.saveBodyWeight(weightVal, selectedDate);

    setWeightModalVisible(false);
    setCurrentWeight("");
    Alert.alert("Success", `Logged ${weightVal}kg for ${selectedDate}`);
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

  const renderRightActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>,
    id: string,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteWorkout(id)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={30} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderNoteRightActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>,
    note: ExerciseNote,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity
        style={styles.noteDeleteAction}
        onPress={() => deleteHistoryNote(note)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
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
        {/* --- NEW: Weight Button inside/below calendar container --- */}
        <TouchableOpacity
          style={styles.weightButton}
          onPress={() => setWeightModalVisible(true)}
        >
          <MaterialCommunityIcons
            name="scale-bathroom"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.weightButtonText}>Log Body Weight</Text>
        </TouchableOpacity>
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
              ref={(ref) => {
                if (ref) rowRefs.current[item.id] = ref;
              }}
              onSwipeableRightOpen={() => deleteWorkout(item.id)}
              renderRightActions={(p, d) => renderRightActions(p, d, item.id)}
              rightThreshold={SCREEN_WIDTH * 0.4}
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
        style={[styles.fab, isActive && { backgroundColor: "#32D74B" }]}
        onPress={() => {
          if (isActive) {
            router.push("/record-workout");
          } else {
            router.push("/workouts/new");
          }
        }}
      >
        <Ionicons name={isActive ? "play" : "add"} size={24} color="#fff" />
        <Text style={styles.fabText}>
          {isActive ? "Continue Workout" : "Record Workout"}
        </Text>
      </TouchableOpacity>

      {/* --- Notes Modal --- */}
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
                renderRightActions={(p, d) =>
                  renderNoteRightActions(p, d, note)
                }
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

      {/* --- NEW: Weight Entry Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={weightModalVisible}
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <View style={styles.weightModalView}>
            <Text style={styles.weightModalTitle}>Log Body Weight</Text>
            <Text style={styles.weightModalSub}>For {selectedDate}</Text>

            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                autoFocus
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>

            <View style={styles.weightActions}>
              <TouchableOpacity
                style={styles.weightCancelBtn}
                onPress={() => setWeightModalVisible(false)}
              >
                <Text style={styles.weightCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.weightSaveBtn}
                onPress={handleSaveWeight}
              >
                <Text style={styles.weightSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  // Weight Button Styles
  weightButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  weightButtonText: {
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  itemWrapper: { paddingHorizontal: 16 },
  deleteAction: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
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

  // --- Weight Modal Styles ---
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  weightModalView: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  weightModalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  weightModalSub: { fontSize: 14, color: "#666", marginBottom: 20 },
  weightInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  weightInput: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    padding: 8,
    minWidth: 80,
    textAlign: "center",
  },
  weightUnit: { fontSize: 20, color: "#999", marginLeft: 4, marginBottom: 6 },
  weightActions: { flexDirection: "row", width: "100%", gap: 12 },
  weightCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  weightSaveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  weightCancelText: { fontSize: 16, fontWeight: "600", color: "#666" },
  weightSaveText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
