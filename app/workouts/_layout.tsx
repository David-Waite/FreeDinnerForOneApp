import { Stack } from "expo-router";
import Colors from "../../constants/Colors";

export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: Colors.primary }}>
      <Stack.Screen name="index" options={{ title: "Workouts" }} />
      <Stack.Screen
        name="template-editor"
        options={{ title: "Edit Template", presentation: "modal" }}
      />
      {/* We will update the recorder later to use these templates */}
      <Stack.Screen name="record" options={{ title: "Record Session" }} />
    </Stack>
  );
}
