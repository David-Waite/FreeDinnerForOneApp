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
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context"; // Added
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

    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        privacySettings: newSettings,
      });
    } catch (error) {
      console.error("Failed to update setting:", error);
      Alert.alert("Error", "Failed to save setting.");
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
        <Text style={styles.settingLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Platform.OS === "ios" ? undefined : Colors.white}
        ios_backgroundColor={Colors.border}
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* CUSTOM DUO HEADER */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color={Colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PRIVACY & DATA</Text>
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

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              auth.signOut();
            }}
          >
            <Text style={styles.logoutText}>LOG OUT</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>VERSION 1.0.4 - DUO MODE ACTIVE</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  // Header Styles
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1.5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  // Body Styles
  section: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  textContainer: { flex: 1, paddingRight: 10 },
  settingLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: "600",
  },
  divider: { height: 2, backgroundColor: Colors.border, marginHorizontal: 16 },

  logoutBtn: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  versionText: {
    textAlign: "center",
    color: Colors.placeholder,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 10,
    letterSpacing: 1,
  },
});
