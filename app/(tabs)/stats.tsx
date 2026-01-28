import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import Colors from "../../constants/Colors";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { MasterExercise } from "../../constants/types";
import { useExerciseStats } from "../../hooks/useExerciseStats";
import AnalyticsChart from "../../components/stats/AnalyticsChart";

// Added "weight" to ChartMode
type ChartMode =
  | "volume"
  | "actual"
  | "estimated"
  | "consistency"
  | "time"
  | "weight";

export default function StatsScreen() {
  const [selectedExercise, setSelectedExercise] =
    useState<MasterExercise | null>(null);
  const [mode, setMode] = useState<ChartMode>("volume");
  const [exerciseList, setExerciseList] = useState<MasterExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Hook handles data fetching
  const {
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    bodyWeightData, // <--- Destructure new data
    refresh,
  } = useExerciseStats(selectedExercise?.name || null);

  // Load exercises list
  useEffect(() => {
    WorkoutRepository.getMasterExercises().then((list) => {
      setExerciseList(list);
      if (list.length > 0 && !selectedExercise) {
        setSelectedExercise(list[0]);
      }
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, []),
  );

  const renderPicker = () => (
    <Modal
      visible={pickerVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Exercise</Text>
        <TouchableOpacity onPress={() => setPickerVisible(false)}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={exerciseList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.pickerItem}
            onPress={() => {
              setSelectedExercise(item);
              setPickerVisible(false);
            }}
          >
            <Text style={styles.pickerItemText}>{item.name}</Text>
            {selectedExercise?.id === item.id && (
              <Ionicons name="checkmark" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        )}
      />
    </Modal>
  );

  // Determine what to show
  let chartData = [];
  let chartType: "line" | "bar" = "line";
  let unit = "";
  let color = Colors.primary;

  switch (mode) {
    case "volume":
      chartData = volumeData;
      unit = "kg";
      color = "#32ADE6";
      break;
    case "actual":
      chartData = maxStrengthData;
      unit = "kg";
      color = "#34C759";
      break;
    case "estimated":
      chartData = oneRMData;
      unit = "kg";
      color = "#FF9500";
      break;
    case "consistency":
      chartData = consistencyData;
      chartType = "bar";
      unit = "Workouts";
      color = "#AF52DE";
      break;
    case "time":
      chartData = durationData;
      unit = "mins";
      color = "#FF2D55";
      break;
    case "weight": // <--- NEW CASE
      chartData = bodyWeightData;
      unit = "kg";
      color = "#007AFF";
      break;
  }

  // Helper to format tab titles nicely
  const getTabTitle = (m: ChartMode) => {
    switch (m) {
      case "weight":
        return "Body Weight";
      default:
        return m.charAt(0).toUpperCase() + m.slice(1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Metric Selector Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          {[
            "volume",
            "actual",
            "estimated",
            "consistency",
            "time",
            "weight", // <--- Added to list
          ].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.tab, mode === m && styles.activeTab]}
              onPress={() => setMode(m as ChartMode)}
            >
              <Text
                style={[styles.tabText, mode === m && styles.activeTabText]}
              >
                {getTabTitle(m as ChartMode)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise Selector (Only if mode is exercise specific) */}
        {["volume", "actual", "estimated"].includes(mode) && (
          <TouchableOpacity
            style={styles.exerciseSelector}
            onPress={() => setPickerVisible(true)}
          >
            <View>
              <Text style={styles.selectorLabel}>Tracking Analysis For</Text>
              <Text style={styles.selectorValue}>
                {selectedExercise?.name || "Select Exercise"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#999" />
          </TouchableOpacity>
        )}

        {/* Chart Area */}
        <View style={styles.chartContainer}>
          <AnalyticsChart
            data={chartData}
            type={chartType}
            color={color}
            unit={unit}
          />
        </View>

        {/* Insights / Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Entries</Text>
            <Text style={styles.statValue}>{chartData.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              {mode === "weight" ? "Last Recorded" : "Peak"}
            </Text>
            <Text style={styles.statValue}>
              {mode === "weight"
                ? (chartData[chartData.length - 1]?.y ?? "-")
                : Math.max(...chartData.map((d) => d.y), 0)}{" "}
              {unit.split(" ")[0]}
            </Text>
          </View>
        </View>
      </ScrollView>

      {renderPicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#000" },
  content: { padding: 16 },

  tabsContainer: { flexDirection: "row", marginBottom: 16, height: 40 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeTab: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontWeight: "600", color: "#666" },
  activeTabText: { color: "#fff" },

  exerciseSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  selectorValue: { fontSize: 18, fontWeight: "600", color: "#333" },

  chartContainer: { marginBottom: 16 },

  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#333" },

  // Picker Modal
  modalHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  closeText: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pickerItemText: { fontSize: 16, color: "#333" },
});
