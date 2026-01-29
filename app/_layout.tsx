import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebase";
import { WorkoutProvider } from "../context/WorkoutContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import GlobalWorkoutBanner from "../components/GlobalWorkoutBanner";

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Listen for Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Handle Routing based on Auth State
  useEffect(() => {
    if (initializing) return;

    // We only force-redirect from LOGIN.
    // We let the Signup screen handle its own navigation (to profile pic).
    const isLoginRoute = segments[0] === "login";

    // Also redirect if they are on the "signup" page but it's been a while?
    // For simplicity, we just won't force-redirect from signup via this effect.
    // The Signup component will handle the "success" case.

    if (user && isLoginRoute) {
      router.replace("/(tabs)");
    } else if (!user && segments[0] !== "login" && segments[0] !== "signup") {
      // Protect app routes (tabs, modal, etc)
      router.replace("/login");
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <WorkoutProvider>
      <GestureHandlerRootView style={styles.container}>
        <GlobalWorkoutBanner />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* 1. Main App Content */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="post-modal"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            {/* 2. Other Full Screen Screens */}
            <Stack.Screen
              name="record-workout"
              options={{
                headerShown: false,
                gestureEnabled: false,
                presentation: "fullScreenModal",
              }}
            />

            {/* NEW: Settings Screen */}
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true, // Show header for back button
                title: "Settings",
                presentation: "card", // Or 'modal' if you prefer that look
              }}
            />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen
              name="signup-profile-pic"
              options={{ headerShown: false }}
            />
            {/* 3. Modals (Must be below the screens they appear over) */}
          </Stack>
        </View>
      </GestureHandlerRootView>
    </WorkoutProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});
