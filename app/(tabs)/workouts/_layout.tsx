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
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Hidden header so we can use our custom 'CHOOSE YOUR PATH' header */}
      <Stack.Screen name="new" options={{ headerShown: false }} />

      {/* Hidden header so we can use the custom editor header */}
      <Stack.Screen
        name="template-editor"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}
