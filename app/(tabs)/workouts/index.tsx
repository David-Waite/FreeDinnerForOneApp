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
import { SafeAreaView } from "react-native-safe-area-context";

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

  const handleSaveWeight = async () => {
    if (!currentWeight) return;
    const weightVal = parseFloat(currentWeight);
    if (isNaN(weightVal))
      return Alert.alert("INVALID INPUT", "Enter a valid number.");

    await WorkoutRepository.saveBodyWeight(weightVal, selectedDate);
    setWeightModalVisible(false);
    setCurrentWeight("");
    Alert.alert("LOGGED", `Body weight saved for ${selectedDate}`);
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    history.forEach((session) => {
      const dateKey = session.date.split("T")[0];
      marks[dateKey] = { marked: true, dotColor: Colors.gold };
    });
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.primary,
      selectedTextColor: Colors.white,
    };
    return marks;
  }, [history, selectedDate]);

  const dayWorkouts = useMemo(
    () => history.filter((s) => s.date.startsWith(selectedDate)),
    [history, selectedDate],
  );

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* CUSTOM DUO HEADER */}
      <View style={styles.customHeader}>
        <View>
          <Text style={styles.headerSubtitle}>YOUR JOURNEY</Text>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <TouchableOpacity
          style={styles.statsIconCircle}
          onPress={() => router.push("/stats")}
        >
          <Ionicons name="stats-chart" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <Calendar
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.surface,
            calendarBackground: Colors.surface,
            textSectionTitleColor: Colors.textMuted,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.white,
            todayTextColor: Colors.gold,
            dayTextColor: Colors.text,
            textDisabledColor: Colors.border,
            dotColor: Colors.gold,
            monthTextColor: Colors.text,
            indicatorColor: Colors.primary,
            textDayFontWeight: "800",
            textMonthFontWeight: "900",
            textDayHeaderFontWeight: "900",
          }}
        />
        <TouchableOpacity
          style={styles.weightStrip}
          onPress={() => setWeightModalVisible(true)}
        >
          <MaterialCommunityIcons
            name="scale-bathroom"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.weightStripText}>LOG BODY WEIGHT</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        {new Date(selectedDate)
          .toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })
          .toUpperCase()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={dayWorkouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <HistoryWorkoutCard
              workout={item}
              defaultExpanded={dayWorkouts.length === 1}
              allNotes={allNotes}
              onViewNotes={(notes) => {
                setViewingNotes(notes);
                setNotesModalVisible(true);
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={48}
              color={Colors.border}
            />
            <Text style={styles.emptyText}>REST DAY</Text>
            <Text style={styles.emptySubText}>
              Consistency is key, but rest is essential.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          isActive && {
            backgroundColor: Colors.success,
            borderBottomColor: "#46a302",
          },
        ]}
        onPress={() =>
          isActive
            ? router.push("/record-workout")
            : router.push("/workouts/new")
        }
      >
        <Ionicons
          name={isActive ? "play" : "add"}
          size={26}
          color={Colors.white}
        />
        <Text style={styles.fabText}>
          {isActive ? "CONTINUE" : "NEW SESSION"}
        </Text>
      </TouchableOpacity>

      {/* Weight Modal */}
      <Modal animationType="fade" transparent visible={weightModalVisible}>
        <View style={styles.centeredView}>
          <View style={styles.weightModalView}>
            <Text style={styles.weightModalTitle}>BODY WEIGHT</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={styles.weightInput}
                placeholder="0.0"
                placeholderTextColor={Colors.placeholder}
                keyboardType="decimal-pad"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                autoFocus
              />
              <Text style={styles.weightUnit}>KG</Text>
            </View>
            <View style={styles.weightActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setWeightModalVisible(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveWeight}
              >
                <Text style={styles.modalPrimaryBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerWrapper: { padding: 16 },
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.text,
  },
  statsIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
    overflow: "hidden",
    marginBottom: 24,
  },
  weightStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  weightStripText: {
    color: Colors.primary,
    fontWeight: "900",
    marginLeft: 8,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 16,
    letterSpacing: 1,
  },
  itemWrapper: { paddingHorizontal: 16, marginBottom: 12 },
  emptyCard: {
    alignItems: "center",
    padding: 40,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textMuted,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.placeholder,
    marginTop: 4,
    textAlign: "center",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  fabText: {
    color: Colors.white,
    fontWeight: "900",
    marginLeft: 10,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(19, 31, 36, 0.85)",
  },
  weightModalView: {
    width: "85%",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  weightModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 20,
    letterSpacing: 1,
  },
  weightInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 30,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  weightInput: {
    fontSize: 48,
    fontWeight: "900",
    color: Colors.text,
    padding: 10,
    textAlign: "center",
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.placeholder,
    marginLeft: 5,
  },
  weightActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 15,
    borderBottomWidth: 4,
    borderBottomColor: "#46a302",
    alignItems: "center",
  },
  modalPrimaryBtnText: { color: Colors.white, fontWeight: "900", fontSize: 14 },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    alignItems: "center",
  },
  modalSecondaryBtnText: {
    color: Colors.textMuted,
    fontWeight: "900",
    fontSize: 14,
  },
});
