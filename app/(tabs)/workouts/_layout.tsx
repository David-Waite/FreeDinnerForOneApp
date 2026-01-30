import { Stack } from "expo-router";
import Colors from "../../../constants/Colors";

export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: Colors.primary,
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { fontWeight: "900" },
        headerShadowVisible: false,
      }}
    >
      {/* Disable native header for History to use custom Duo header */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Screen name="new" options={{ title: "START WORKOUT" }} />

      <Stack.Screen
        name="template-editor"
        options={{ title: "EDIT TEMPLATE", presentation: "modal" }}
      />
    </Stack>
  );
}
