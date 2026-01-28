import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, View } from "react-native";
import { WorkoutProvider } from "../context/WorkoutContext";
import GlobalWorkoutBanner from "../components/GlobalWorkoutBanner";
import { useEffect } from "react";
import { seedDatabase } from "../utils/seedData";

export default function RootLayout() {
  useEffect(() => {
    // Uncomment this line to run the seed, then comment it out again
    seedDatabase();
  }, []);
  return (
    <WorkoutProvider>
      <GestureHandlerRootView style={styles.container}>
        <GlobalWorkoutBanner />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="record-workout"
              options={{
                headerShown: false,
                gestureEnabled: false,
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="post-modal"
              options={{ presentation: "modal", headerShown: false }}
            />
          </Stack>
        </View>
      </GestureHandlerRootView>
    </WorkoutProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});
