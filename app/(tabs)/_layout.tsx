import { Tabs, useRouter } from "expo-router";
import React from "react";
import {
  FontAwesome,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconSelected,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false, // We handle headers inside the screens now
        tabBarShowLabel: false,
      }}
    >
      {/* 1. Feed (Maps to app/(tabs)/index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />

      {/* 2. Leaderboard */}
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="trophy" size={24} color={color} />
          ),
        }}
      />

      {/* 3. Create (The Middle Button) */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Post",
          tabBarIcon: ({ focused }) => (
            <View style={styles.plusButton}>
              <Ionicons name="add" size={32} color="#fff" />
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault(); // Stop default navigation
            router.push("/post-modal"); // Open the root modal
          },
        })}
      />

      {/* 4. Stats */}
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <FontAwesome name="bar-chart" size={24} color={color} />
          ),
        }}
      />

      {/* 5. Workouts */}
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="dumbbell" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
