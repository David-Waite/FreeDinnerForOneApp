import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    encryptWorkouts: true,
    encryptBodyWeight: true,
    shareExercisesToGlobal: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.privacySettings) {
          setSettings(userData.privacySettings);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      Alert.alert("Error", "Could not load settings.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Optimistic Update (Update UI immediately)
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    try {
      // 2. Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        privacySettings: newSettings,
      });
    } catch (error) {
      console.error("Failed to update setting:", error);
      Alert.alert("Error", "Failed to save setting.");
      // Revert on error
      setSettings(settings);
    }
  };

  const renderSwitchItem = (
    label: string,
    description: string,
    key: keyof typeof settings,
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.textContainer}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: "#767577", true: Colors.primary }}
        thumbColor={"#f4f3f4"}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Privacy & Data</Text>
        <View style={styles.card}>
          {renderSwitchItem(
            "Encrypt Workouts",
            "Keep your workout details private.",
            "encryptWorkouts",
          )}
          <View style={styles.divider} />
          {renderSwitchItem(
            "Encrypt Body Weight",
            "Hide your weight logs from others.",
            "encryptBodyWeight",
          )}
          <View style={styles.divider} />
          {renderSwitchItem(
            "Share Exercises",
            "Allow your custom exercises to appear in the global library.",
            "shareExercisesToGlobal",
          )}
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            auth.signOut();
            // Router listener in _layout will handle redirect to login
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7", padding: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { marginBottom: 30 },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginLeft: 10,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  textContainer: { flex: 1, paddingRight: 10 },
  settingLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  settingDescription: { fontSize: 13, color: "#888", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginLeft: 16 },
  logoutBtn: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#ff3b30", fontSize: 16, fontWeight: "600" },
});
