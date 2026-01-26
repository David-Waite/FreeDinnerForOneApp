import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useWorkoutContext } from "../context/WorkoutContext";
import { Ionicons } from "@expo/vector-icons";

export default function GlobalWorkoutBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { isActive, elapsedSeconds, sessionId } = useWorkoutContext();

  // SAFETY CHECK:
  // 1. Must be active
  // 2. Must have a valid session ID
  // 3. Must NOT be on the record screen (to avoid double headers)
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
      {/* SafeAreaView ensures we don't overlap the notch/status bar on iOS */}
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity
          style={styles.container}
          onPress={() => router.push("/record-workout")}
          activeOpacity={0.9}
        >
          <View style={styles.content}>
            <View style={styles.leftSide}>
              <View style={styles.activeDot} />
              <Text style={styles.label}>Workout in Progress</Text>
            </View>

            <View style={styles.rightSide}>
              <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#065f46" />
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#d1fae5", // Match container color
    width: "100%",
    zIndex: 9999, // Ensure it sits on top of everything
    // Shadow for elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  safeArea: {
    backgroundColor: "#d1fae5",
    // Android status bar padding handling if not using Translucent
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#d1fae5",
    borderBottomWidth: 1,
    borderBottomColor: "#a7f3d0",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669", // Green dot
  },
  label: {
    color: "#065f46",
    fontWeight: "600",
    fontSize: 14,
  },
  timer: {
    color: "#065f46",
    fontWeight: "700",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
});
