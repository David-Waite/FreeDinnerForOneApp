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

    const inTabsGroup = segments[0] === "(tabs)";

    // Define which segments are strictly for unauthenticated users
    // (Add any other public/auth screens here if you have them)
    const isAuthRoute = segments[0] === "login" || segments[0] === "signup";

    if (user && isAuthRoute) {
      // 1. User is logged in but on login/signup page. Redirect to app.
      router.replace("/(tabs)");
    } else if (!user && !isAuthRoute) {
      // 2. User is NOT logged in but trying to access a protected route
      // (like tabs, post-modal, or record-workout). Redirect to login.
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
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
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
