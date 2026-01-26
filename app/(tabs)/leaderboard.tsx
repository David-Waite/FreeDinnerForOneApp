import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWorkoutContext } from "../../context/WorkoutContext"; // Ensure path is correct
import Colors from "../../constants/Colors"; // Optional, for styling

export default function LeaderboardScreen() {
  const { cancelSession } = useWorkoutContext();

  const handleReset = async () => {
    Alert.alert(
      "⚠ Reset App?",
      "This will permanently delete ALL local data (workouts, posts, templates) and reset the current state. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Nuke It",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Clear all physical storage
              await AsyncStorage.clear();

              // 2. Reset the in-memory context (clears Banner immediately)
              await cancelSession();

              Alert.alert("Success", "App has been reset to a fresh state.");
            } catch (e) {
              Alert.alert("Error", "Failed to clear data.");
              console.error(e);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>Hypothetical Payments Pending...</Text>

      <View style={styles.spacer} />

      {/* DEBUG BUTTON */}
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset All Data (Debug)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666" },
  spacer: { height: 50 },
  resetButton: {
    backgroundColor: "#ef4444", // Red color
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
