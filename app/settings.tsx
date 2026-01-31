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
  Image,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutRepository } from "../services/WorkoutRepository";
import * as ImagePicker from "expo-image-picker";

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
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
        const data = userDoc.data();
        setUserData(data);
        if (data.privacySettings) {
          setSettings(data.privacySettings);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      Alert.alert("Error", "Could not load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async (useCamera: boolean) => {
    setPickerModalVisible(false);

    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "PERMISSION DENIED",
          "We need camera access to take your athlete photo!",
        );
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
    }

    if (!result.canceled) {
      try {
        setLoading(true);
        const newUrl = await WorkoutRepository.uploadProfilePicture(
          result.assets[0].uri,
        );
        setUserData({ ...userData, photoURL: newUrl });
        Alert.alert("SUCCESS", "Looking sharp! Profile picture updated.");
      } catch (e: any) {
        Alert.alert("UPLOAD FAILED", e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    const user = auth.currentUser;
    if (!user) return;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { privacySettings: newSettings });
    } catch (error) {
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

  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
        {/* ATHLETE PROFILE CARD */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ATHLETE PROFILE</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.imageShadowBase}>
                {userData?.photoURL ? (
                  <Image
                    source={{ uri: userData.photoURL }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.placeholderAvatar}>
                    <Text style={styles.placeholderText}>
                      {userData?.displayName?.charAt(0).toUpperCase() || "A"}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.editBadge}
                onPress={() => setPickerModalVisible(true)}
              >
                <Ionicons name="camera" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userData?.displayName || "Athlete"}
              </Text>
              <Text style={styles.profileUsername}>
                @{userData?.username || "username"}
              </Text>
            </View>
          </View>
        </View>

        {/* SETTINGS CARD */}
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

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => auth.signOut()}
        >
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PHOTO SOURCE PICKER MODAL */}
      <Modal visible={pickerModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.modalTitle}>UPDATE PHOTO</Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => handleImagePick(true)}
            >
              <Ionicons name="camera" size={24} color={Colors.primary} />
              <Text style={styles.modalBtnText}>TAKE A PHOTO</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => handleImagePick(false)}
            >
              <Ionicons name="images" size={24} color={Colors.primary} />
              <Text style={styles.modalBtnText}>CHOOSE FROM LIBRARY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  section: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1.5,
  },

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: { position: "relative", marginRight: 20 },
  imageShadowBase: {
    width: 84,
    height: 84,
    backgroundColor: Colors.border,
    borderRadius: 22,
    justifyContent: "flex-start",
  },
  avatarImage: {
    width: 84,
    height: 80,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  placeholderAvatar: {
    width: 84,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  placeholderText: { fontSize: 32, fontWeight: "900", color: Colors.primary },
  editBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.surface,
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  profileUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 2,
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
    marginTop: 10,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModal: {
    width: "85%",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 1,
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    marginBottom: 12,
    gap: 12,
  },
  modalBtnText: { fontSize: 14, fontWeight: "900", color: Colors.text },
  cancelBtn: { alignItems: "center", padding: 12, marginTop: 8 },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
