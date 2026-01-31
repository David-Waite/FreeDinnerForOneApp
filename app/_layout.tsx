import "react-native-get-random-values";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebase";
import { WorkoutProvider, useWorkoutContext } from "../context/WorkoutContext"; // Import Context Hook
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import GlobalWorkoutBanner from "../components/GlobalWorkoutBanner";
import { WorkoutRepository } from "../services/WorkoutRepository";
import Colors from "../constants/Colors";
import { NotificationService } from "../services/NotificationService";

// --- INNER COMPONENT TO HANDLE HYDRATION UI ---
function AppContent() {
  const { isHydrating } = useWorkoutContext();

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Syncing your data...</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          // This makes the general transition feel faster across the whole app
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen
          name="post-modal"
          options={{ presentation: "modal", headerShown: false }}
        />

        <Stack.Screen
          name="record-workout"
          options={{
            headerShown: false,
            gestureEnabled: false,
            presentation: "fullScreenModal",
            // DUO POLISH: Fast slide from bottom
            animation: "slide_from_bottom",
            animationDuration: 250, // Standard Duo "snappy" speed
          }}
        />

        <Stack.Screen
          name="settings"
          options={{ presentation: "modal", headerShown: false }}
        />

        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // 1. Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // 2. Sync Global Data (Only if logged in)
  useEffect(() => {
    if (user) {
      WorkoutRepository.syncGlobalExercises();
      WorkoutRepository.ensureWeeklyCap();
    }
  }, [user]);

  useEffect(() => {
    // This asks for permission immediately on app load
    // You don't need a userId for local timers, so passing undefined is fine for now
    NotificationService.registerForPushNotificationsAsync(undefined);
  }, []);

  // 3. Handle Redirects
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const inPublicGroup = segments[0] === "login" || segments[0] === "signup";

    if (user && inPublicGroup) {
      router.replace("/(tabs)");
    } else if (!user && !inPublicGroup) {
      router.replace("/login");
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <WorkoutProvider>
      <GestureHandlerRootView style={styles.container}>
        <GlobalWorkoutBanner />
        {/* We moved the Stack inside AppContent to access the Context */}
        <AppContent />
      </GestureHandlerRootView>
    </WorkoutProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 20,
    color: Colors.text, // Ensure text is visible
    fontSize: 16,
    fontWeight: "600",
  },
});
