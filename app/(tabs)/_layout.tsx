import { Tabs, useRouter } from "expo-router";
import React from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { StyleSheet, View, Platform, Text } from "react-native";
import DuoTouch from "../../components/ui/DuoTouch";

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
        // Apply light haptic and squish to every tab
        tabBarButton: (props) => (
          <DuoTouch
            {...props}
            hapticStyle="light"
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* THE HEAVY 3D PLUS BUTTON */}
      <Tabs.Screen
        name="create"
        options={{
          tabBarButton: (props) => (
            <DuoTouch
              {...props}
              hapticStyle="heavy" // heavier haptic for the big button
              style={styles.plusButtonContainer}
              onPress={() => router.push("/post-modal")}
            >
              <View style={styles.plusButtonBase}>
                <View style={styles.plusButtonTop}>
                  <Ionicons name="add" size={32} color={Colors.white} />
                </View>
              </View>
            </DuoTouch>
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="workouts"
        options={{
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
    height: Platform.OS === "ios" ? 95 : 70, // Slightly taller for chunky buttons
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  plusButtonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -15, // Lift the button out of the bar
  },
  plusButtonBase: {
    width: 60,
    height: 58,
    backgroundColor: "#46a302", // Dark base
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  plusButtonTop: {
    width: "100%",
    height: 50, // shorter than base to show the 3D depth
    borderRadius: 15,
    backgroundColor: Colors.primary, // Bright Duo Green
    justifyContent: "center",
    alignItems: "center",
  },
});
