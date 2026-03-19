import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { CardioSession, CardioActivityType } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";

type Props = {
  session: CardioSession;
  onDeleted: () => void;
};

const ACTIVITY_CONFIG: Record<
  CardioActivityType,
  { label: string; icon: string; color: string }
> = {
  run: { label: "RUN", icon: "🏃", color: Colors.error },
  walk: { label: "WALK", icon: "🚶", color: Colors.info },
  cycle: { label: "CYCLE", icon: "🚴", color: Colors.warning },
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return "--:--/km";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export default function CardioHistoryCard({ session, onDeleted }: Props) {
  const config = ACTIVITY_CONFIG[session.activityType];

  const handleDelete = () => {
    Alert.alert("DELETE SESSION", "Remove this cardio session?", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          await WorkoutRepository.deleteCardioSession(session.id);
          onDeleted();
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { borderColor: config.color }]}>
          <Text style={styles.icon}>{config.icon}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.activityLabel, { color: config.color }]}>
            {config.label}
          </Text>
          <Text style={styles.modeLabel}>
            {session.mode === "live" ? "GPS TRACKED" : "MANUAL LOG"}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{session.distance.toFixed(2)}</Text>
          <Text style={styles.statLabel}>KM</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(session.duration)}</Text>
          <Text style={styles.statLabel}>DURATION</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatPace(session.pace)}</Text>
          <Text style={styles.statLabel}>PACE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: { fontSize: 22 },
  headerText: { flex: 1 },
  activityLabel: { fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  modeLabel: { fontSize: 10, fontWeight: "800", color: Colors.textMuted, marginTop: 2, letterSpacing: 1 },
  deleteBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  stats: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: 9, fontWeight: "900", color: Colors.textMuted, letterSpacing: 1, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 4 },
});
