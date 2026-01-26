import { Stack } from "expo-router";
import Colors from "../../../constants/Colors";

export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: Colors.primary }}>
      {/* 1. Dashboard (Calendar) */}
      <Stack.Screen name="index" options={{ title: "History" }} />

      {/* 2. New Workout (Template Picker) */}
      <Stack.Screen name="new" options={{ title: "Start Workout" }} />

      {/* 3. Editor */}
      <Stack.Screen
        name="template-editor"
        options={{ title: "Edit Template", presentation: "modal" }}
      />
    </Stack>
  );
}
