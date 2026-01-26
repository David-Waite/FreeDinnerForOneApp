import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { WorkoutPost } from "../constants/types";

export default function PostModal() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // --- OPTION 1: Choose from Library ---
  const pickFromLibrary = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to allow access to photos to upload a workout picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // --- OPTION 2: Take Photo with Camera ---
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "You need to allow camera access to take a workout picture.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!image && !message.trim()) {
      Alert.alert("Empty Post", "Please add a photo or a message to post.");
      return;
    }

    setUploading(true);

    const newPost: WorkoutPost = {
      id: Date.now().toString(),
      userId: "current-user",
      userName: "David",
      message: message,
      imageUri: image || undefined,
      date: new Date().toISOString(),
      comments: [], // <--- FIX: Initialize empty array
    };

    await WorkoutRepository.createPost(newPost);

    setUploading(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity onPress={handlePost} disabled={uploading}>
            <Text style={[styles.postBtn, uploading && { color: "#ccc" }]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="What did you crush today?"
              multiline
              value={message}
              onChangeText={setMessage}
              autoFocus
            />
          </View>

          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mediaButtonsContainer}>
              {/* Camera Button */}
              <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#e3f2fd" }]}
                >
                  <Ionicons name="camera" size={30} color={Colors.primary} />
                </View>
                <Text style={styles.mediaBtnText}>Camera</Text>
              </TouchableOpacity>

              {/* Library Button */}
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={pickFromLibrary}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#f0f2f5" }]}
                >
                  <Ionicons name="images" size={30} color="#666" />
                </View>
                <Text style={styles.mediaBtnText}>Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingTop: 20,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  cancelBtn: { fontSize: 16, color: "#333" },
  postBtn: { fontSize: 16, fontWeight: "bold", color: Colors.primary },

  content: { padding: 20 },
  inputRow: { marginBottom: 20 },
  input: { fontSize: 18, minHeight: 60, textAlignVertical: "top" },

  mediaButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  mediaBtn: {
    flex: 1,
    height: 150,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    // Slight shadow for depth
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  mediaBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  imageContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: 300, borderRadius: 12 },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
  },
});
