import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useExerciseStats } from "../hooks/useExerciseStats";
import AnalyticsChart from "../components/stats/AnalyticsChart";
import Colors from "../constants/Colors";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function StatsDetailScreen() {
  const router = useRouter();
  const { mode, exerciseName, targetUserId } = useLocalSearchParams();

  const {
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    bodyWeightData,
  } = useExerciseStats(exerciseName as string, targetUserId as string);

  let chartData: any[] = [];
  let unit = "";
  let color = Colors.primary;
  let title = "";

  switch (mode) {
    case "volume":
      chartData = volumeData;
      unit = "kg";
      color = Colors.info;
      title = "VOLUME";
      break;
    case "actual":
      chartData = maxStrengthData;
      unit = "kg";
      color = Colors.success;
      title = "STRENGTH";
      break;
    case "estimated":
      chartData = oneRMData;
      unit = "kg";
      color = Colors.gold;
      title = "EST. 1RM";
      break;
    case "consistency":
      chartData = consistencyData;
      unit = "days";
      color = Colors.purple;
      title = "CONSISTENCY";
      break;
    case "time":
      chartData = durationData;
      unit = "min";
      color = Colors.error;
      title = "DURATION";
      break;
    case "weight":
      chartData = bodyWeightData;
      unit = "kg";
      color = Colors.primary;
      title = "BODY WEIGHT";
      break;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.subtitle}>{exerciseName}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* GRAPH NOW USES DYNAMIC HEIGHT FOR MAXIMUM IMPACT */}
        <View style={styles.chartContainer}>
          <AnalyticsChart
            data={chartData}
            type="line"
            color={color}
            unit={unit}
          />
        </View>

        <View style={styles.statDetailBox}>
          <View style={styles.statItem}>
            <Text style={styles.detailLabel}>ALL TIME PEAK</Text>
            <Text style={[styles.detailValue, { color }]}>
              {chartData.length > 0
                ? Math.max(...chartData.map((d) => d.y)).toFixed(1)
                : "-"}{" "}
              {unit}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.detailLabel}>DATA POINTS</Text>
            <Text style={styles.detailValue}>{chartData.length}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  titleContainer: { alignItems: "center" },
  subtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  title: { fontSize: 20, fontWeight: "900", color: Colors.text },

  content: { padding: 16, flex: 1 },

  // CHART CONTAINER: Increased height to ~55% of screen
  chartContainer: {
    height: SCREEN_HEIGHT * 0.5,
    width: "100%",
    marginBottom: 20,
  },

  statDetailBox: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: { alignItems: "center", flex: 1 },
  divider: { width: 2, height: "80%", backgroundColor: Colors.border },
  detailLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailValue: { fontSize: 28, fontWeight: "900", color: Colors.text },
});
