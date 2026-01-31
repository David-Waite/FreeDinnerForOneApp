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
  let chartType: "line" | "bar" | "grid" = "line";

  switch (mode) {
    case "volume":
      chartData = volumeData;
      unit = "kg";
      color = Colors.info;
      title = "VOLUME";
      chartType = "line";
      break;
    case "actual":
      chartData = maxStrengthData;
      unit = "kg";
      color = Colors.success;
      title = "STRENGTH";
      chartType = "line";
      break;
    case "estimated":
      chartData = oneRMData;
      unit = "kg";
      color = Colors.gold;
      title = "EST. 1RM";
      chartType = "line";
      break;
    case "consistency":
      chartData = consistencyData;
      unit = "days";
      color = Colors.purple;
      title = "CONSISTENCY";
      chartType = "grid";
      break;
    case "time":
      chartData = durationData;
      unit = "min";
      color = Colors.error;
      title = "DURATION";
      chartType = "bar";
      break;
    case "weight":
      chartData = bodyWeightData;
      unit = "kg";
      color = Colors.primary;
      title = "BODY WEIGHT";
      chartType = "line";
      break;
  }

  const isConsistency = mode === "consistency";
  const isWeight = mode === "weight";

  const allTimePeak =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.y)) : 0;

  const completedDays = chartData.filter((d) => d.y > 0).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.subtitle}>
            {exerciseName?.toString().toUpperCase()}
          </Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.chartContainer}>
          <AnalyticsChart
            data={chartData}
            type={chartType}
            color={color}
            unit={unit}
          />
        </View>

        <View style={styles.statDetailBox}>
          {/* Hide this entire section if mode is Weight */}
          {!isWeight && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.detailLabel}>
                  {isConsistency ? "DAYS COMPLETED" : "ALL TIME PEAK"}
                </Text>
                <Text style={[styles.detailValue, { color }]}>
                  {chartData.length > 0
                    ? isConsistency
                      ? completedDays
                      : allTimePeak.toFixed(1)
                    : "-"}
                  <Text style={styles.unitText}> {unit}</Text>
                </Text>
              </View>

              <View style={styles.divider} />
            </>
          )}

          <View style={styles.statItem}>
            <Text style={styles.detailLabel}>
              {isWeight ? "TOTAL LOGS" : "RECORDED ENTRIES"}
            </Text>
            <Text style={styles.detailValue}>{chartData.length}</Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Ionicons name="bulb-outline" size={20} color={color} />
          <Text style={styles.insightText}>
            {isWeight
              ? "Tracking body weight helps you correlate strength gains with physical changes."
              : `Showing your progress for ${exerciseName}. Switch time ranges above to see long-term trends.`}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  chartContainer: {
    height: SCREEN_HEIGHT * 0.48,
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
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  divider: {
    width: 2,
    height: "60%",
    backgroundColor: Colors.border,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  detailValue: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.text,
  },
  unitText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
