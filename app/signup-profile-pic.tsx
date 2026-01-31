import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutRepository } from "../services/WorkoutRepository"; // <--- Import Repository

export default function SignupProfilePicScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "PERMISSION REQUIRED",
        "Camera access is needed to capture your gains!",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!image) return;
    setUploading(true);

    try {
      // --- USE THE REPOSITORY FUNCTION ---
      // This handles blob conversion, timestamping, Auth update, and Firestore update
      await WorkoutRepository.uploadProfilePicture(image);

      router.replace("/(tabs)");
    } catch (error: any) {
      console.error(error);
      Alert.alert("UPLOAD FAILED", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => router.replace("/(tabs)");

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerArea}>
        <Text style={styles.title}>IDENTIFY YOURSELF</Text>
        <Text style={styles.subtitle}>
          Add a profile picture so friends recognize you on the leaderboard!
        </Text>
      </View>

      {/* SQUIRCLE AVATAR AREA */}
      <View style={styles.imageArea}>
        <View style={styles.imageShadowBase}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="person" size={80} color={Colors.textMuted} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={pickImage}
          activeOpacity={0.9}
        >
          <Ionicons name="pencil" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={takePhoto}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>TAKE PHOTO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !image && styles.disabledBtn]}
          onPress={handleSave}
          disabled={!image || uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>SAVE & CONTINUE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>SKIP FOR NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  headerArea: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  imageArea: { position: "relative", marginBottom: 50 },
  // 3D base for the avatar
  imageShadowBase: {
    width: 170,
    height: 170,
    backgroundColor: Colors.border,
    borderRadius: 45, // Squircle look
    justifyContent: "flex-start",
  },
  previewImage: {
    width: 170,
    height: 164,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.border,
  },
  placeholder: {
    width: 170,
    height: 164,
    borderRadius: 45,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.border,
  },
  editBtn: {
    position: "absolute",
    bottom: -10,
    right: -10,
    backgroundColor: Colors.info,
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.background,
    borderBottomWidth: 6,
    borderBottomColor: "#1899d6",
  },
  buttonContainer: { width: "100%", gap: 16 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  disabledBtn: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    opacity: 0.5,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  secondaryBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
    borderBottomColor: Colors.border,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  skipBtn: { marginTop: 10, padding: 10, alignItems: "center" },
  skipText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
