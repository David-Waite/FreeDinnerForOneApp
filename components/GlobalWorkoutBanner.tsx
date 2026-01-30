import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useWorkoutContext } from "../context/WorkoutContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

export default function GlobalWorkoutBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { isActive, elapsedSeconds, sessionId, sessionName } =
    useWorkoutContext();

  // Return null if not active or if we are currently ON the recording screen
  if (!isActive || !sessionId || pathname === "/record-workout") {
    return null;
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TouchableOpacity
          style={styles.container}
          onPress={() => router.push("/record-workout")}
          activeOpacity={0.9}
        >
          <View style={styles.content}>
            <View style={styles.leftSide}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={16}
                  color={Colors.white}
                />
              </View>
              <View>
                <Text style={styles.label}>LIVE SESSION</Text>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {sessionName || "Workout"}
                </Text>
              </View>
            </View>

            <View style={styles.rightSide}>
              <View style={styles.timerContainer}>
                <Ionicons name="time" size={14} color={Colors.white} />
                <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.white} />
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // REMOVED absolute positioning.
    // This allows the banner to push the content down, preventing overlap.
    backgroundColor: Colors.primary,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  safeArea: {
    backgroundColor: Colors.primary,
  },
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: "#46a302",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1,
  },
  sessionTitle: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 14,
    marginTop: -2,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  timer: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
});
