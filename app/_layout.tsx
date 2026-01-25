import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* The Modal */}
        <Stack.Screen
          name="post-modal"
          options={{
            presentation: "modal", // Native iOS modal slide
            headerShown: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
