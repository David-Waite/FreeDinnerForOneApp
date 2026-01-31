import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebase";
import { WorkoutProvider } from "../context/WorkoutContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import GlobalWorkoutBanner from "../components/GlobalWorkoutBanner";
import { WorkoutRepository } from "../services/WorkoutRepository";
import Colors from "../constants/Colors";

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

  // 3. Handle Redirects (FIXED)
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const inPublicGroup = segments[0] === "login" || segments[0] === "signup";

    if (user && inPublicGroup) {
      // If logged in and trying to go to login/signup, redirect to app
      router.replace("/(tabs)");
    } else if (!user && !inPublicGroup) {
      // If NOT logged in and trying to access protected routes, redirect to login
      router.replace("/login");
    }
    // If logged in and in a modal (e.g. post-modal), DO NOTHING.
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <WorkoutProvider>
      <GestureHandlerRootView style={styles.container}>
        {/* If this returns null, the View below will snap to the top */}
        <GlobalWorkoutBanner />

        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
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
      </GestureHandlerRootView>
    </WorkoutProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
