import { Tabs, useRouter } from "expo-router";
import React from "react";
import {
  FontAwesome,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { StyleSheet, View, Platform } from "react-native";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconSelected,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      {/* 1. Feed */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 2. Leaderboard */}
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 3. Create (The 3D Middle Button) */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Post",
          tabBarIcon: () => (
            <View style={styles.plusButton}>
              <View style={styles.plusButtonInner}>
                <Ionicons name="add" size={32} color={Colors.white} />
              </View>
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push("/post-modal");
          },
        })}
      />

      {/* 4. Stats */}
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* 5. Workouts */}
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "dumbbell" : "dumbbell"}
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 3,
    borderTopColor: Colors.border,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 8,
    // Add subtle depth
    elevation: 0,
    shadowOpacity: 0,
  },
  plusButton: {
    width: 54,
    height: 50,
    backgroundColor: "#46a302", // Darker green for the "3D base"
    borderRadius: 14,
    justifyContent: "flex-start",
    marginTop: -4,
  },
  plusButtonInner: {
    width: 54,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary, // Signature Duo Green
    justifyContent: "center",
    alignItems: "center",
    // This creates the "pop" effect from the base
  },
});
