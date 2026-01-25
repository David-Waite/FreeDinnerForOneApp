import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import { WorkoutSession } from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  // Default to today string YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const loadHistory = async () => {
    const data = await WorkoutRepository.getWorkouts();
    setHistory(data);
  };

  // 1. Generate Marked Dates for Calendar
  const markedDates = useMemo(() => {
    const marks: any = {};

    // Mark days with workouts
    history.forEach((session) => {
      const dateKey = session.date.split("T")[0];
      marks[dateKey] = { marked: true, dotColor: Colors.primary };
    });

    // Highlight selected day
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.primary,
      disableTouchEvent: true,
    };

    return marks;
  }, [history, selectedDate]);

  // 2. Filter Workouts for Selected Date
  const dayWorkouts = useMemo(() => {
    return history.filter((s) => s.date.startsWith(selectedDate));
  }, [history, selectedDate]);

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  return (
    <View style={styles.container}>
      {/* Calendar Section */}
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

      {/* Selected Day Details */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>
          {new Date(selectedDate).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        <FlatList
          data={dayWorkouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardTime}>
                  {new Date(item.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <View style={styles.exercisesList}>
                {item.exercises.map((ex, i) => (
                  <Text key={i} style={styles.exerciseText}>
                    • {ex.sets.filter((s) => s.completed).length} x {ex.name}
                    <Text style={styles.bestSet}>
                      {" "}
                      (Top: {Math.max(...ex.sets.map((s) => s.weight))}kg)
                    </Text>
                  </Text>
                ))}
              </View>
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
      </View>

      {/* Record Workout FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/workouts/new")}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Record Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  calendarContainer: {
    backgroundColor: "#fff",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginBottom: 12,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  cardTime: { fontSize: 14, color: "#888" },

  exercisesList: { marginTop: 4 },
  exerciseText: { fontSize: 15, color: "#444", marginBottom: 4 },
  bestSet: { color: "#888", fontSize: 13 },

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
});
