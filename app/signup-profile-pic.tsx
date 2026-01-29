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
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../config/firebase"; // Import storage
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

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

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!image) return;
    setUploading(true);
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "No user found.");
      setUploading(false);
      return;
    }

    try {
      // 1. Convert URI to Blob
      const response = await fetch(image);
      const blob = await response.blob();

      // 2. Upload to Firebase Storage
      const storageRef = ref(storage, `profile/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // 3. Update Auth Profile
      await updateProfile(user, { photoURL: downloadURL });

      // 4. Update Firestore User Doc
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      // 5. Navigate to App
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a Profile Picture</Text>
      <Text style={styles.subtitle}>
        Let others recognize you on the leaderboard!
      </Text>

      <View style={styles.imageArea}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="person" size={80} color="#ccc" />
          </View>
        )}

        {/* Edit Button overlay */}
        <TouchableOpacity style={styles.editBtn} onPress={pickImage}>
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !image && styles.disabledBtn]}
          onPress={handleSave}
          disabled={!image || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
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
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  imageArea: { position: "relative", marginBottom: 40 },
  previewImage: { width: 160, height: 160, borderRadius: 80 },
  placeholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#f2f2f7",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  buttonContainer: { width: "100%", gap: 15 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledBtn: { backgroundColor: "#ccc" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 10,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  skipBtn: { padding: 10, alignItems: "center" },
  skipText: { color: "#888", fontSize: 16 },
});
