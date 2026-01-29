import React, { useState, useEffect } from "react";
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
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { WorkoutPost, WorkoutSession } from "../constants/types";

export default function PostModal() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // --- WORKOUT ATTACHMENT STATE ---
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(
    null,
  );
  const [todaysWorkouts, setTodaysWorkouts] = useState<WorkoutSession[]>([]);
  const [workoutPickerVisible, setWorkoutPickerVisible] = useState(false);

  useEffect(() => {
    loadTodaysWorkouts();
  }, []);

  const loadTodaysWorkouts = async () => {
    const all = await WorkoutRepository.getWorkouts();
    const today = new Date().toDateString();
    const filtered = all.filter(
      (w) => new Date(w.date).toDateString() === today,
    );
    setTodaysWorkouts(filtered);
  };

  const pickFromLibrary = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Allow access to photos to upload.");
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

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Allow camera access to take photo.");
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
    if (!image) {
      Alert.alert("Image Required", "All posts must include a photo.");
      return;
    }

    setUploading(true);
    try {
      const newPost: WorkoutPost = {
        id: Date.now().toString(),
        authorId: "temp", // Will be overwritten by Repository
        authorName: "temp", // Will be overwritten by Repository
        message: message,
        imageUri: image, // Local URI (will be uploaded)
        createdAt: new Date().toISOString(),
        comments: [],
        reactions: {},

        // Pass the Session ID
        sessionId: selectedWorkout?.id,

        workoutSummary: selectedWorkout
          ? {
              id: selectedWorkout.id,
              name: selectedWorkout.name,
              duration: selectedWorkout.duration,
              exerciseCount: selectedWorkout.exercises.length,
            }
          : undefined,
      };

      await WorkoutRepository.createPost(newPost);
      router.back();
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
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
              autoFocus={!image} // Only auto-focus if no image selected yet
            />
          </View>

          {/* --- ATTACHED WORKOUT CARD --- */}
          {selectedWorkout && (
            <View style={styles.attachedWorkoutCard}>
              <View style={styles.workoutIcon}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{selectedWorkout.name}</Text>
                <Text style={styles.workoutSub}>
                  {formatDuration(selectedWorkout.duration)} •{" "}
                  {selectedWorkout.exercises.length} Exercises
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedWorkout(null)}
                style={styles.removeWorkoutBtn}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* --- IMAGE PREVIEW --- */}
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* --- MEDIA BUTTONS (Hide if image exists) --- */}
          {!image && (
            <View style={styles.mediaButtonsContainer}>
              <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#e3f2fd" }]}
                >
                  <Ionicons name="camera" size={30} color={Colors.primary} />
                </View>
                <Text style={styles.mediaBtnText}>Camera</Text>
              </TouchableOpacity>

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

          {/* --- ADD TO POST BAR (Always Visible) --- */}
          <View style={styles.addToPostContainer}>
            <Text style={styles.addToPostLabel}>Add to your post</Text>
            <View style={styles.addToPostActions}>
              {/* Add Workout Button */}
              {!selectedWorkout && (
                <TouchableOpacity
                  onPress={() => setWorkoutPickerVisible(true)}
                  style={styles.actionIconBtn}
                >
                  <MaterialCommunityIcons
                    name="dumbbell"
                    size={28}
                    color="#e91e63"
                  />
                </TouchableOpacity>
              )}

              {/* Add Photo Button (Small Icon if Image already selected, to change it) */}
              {image && (
                <TouchableOpacity
                  onPress={pickFromLibrary}
                  style={styles.actionIconBtn}
                >
                  <Ionicons name="images" size={26} color="#4caf50" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* --- WORKOUT PICKER MODAL --- */}
      <Modal
        visible={workoutPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWorkoutPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Today's Workout</Text>
            <TouchableOpacity onPress={() => setWorkoutPickerVisible(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={todaysWorkouts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={48}
                  color="#ddd"
                />
                <Text style={styles.emptyListText}>
                  No workouts completed today.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.workoutItem}
                onPress={() => {
                  setSelectedWorkout(item);
                  setWorkoutPickerVisible(false);
                }}
              >
                <View>
                  <Text style={styles.workoutItemTitle}>{item.name}</Text>
                  <Text style={styles.workoutItemSub}>
                    {new Date(item.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {formatDuration(item.duration)}
                  </Text>
                </View>
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff" },
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

  // Big Media Buttons (Only when no image)
  mediaButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 10,
  },
  mediaBtn: {
    flex: 1,
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  mediaBtnText: { fontSize: 14, fontWeight: "600", color: "#333" },

  imageContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  previewImage: { width: "100%", height: 300, borderRadius: 12 },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
  },

  // Attached Workout Card
  attachedWorkoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4", // Light green bg
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  workoutInfo: { flex: 1 },
  workoutTitle: { fontWeight: "bold", fontSize: 16, color: "#065f46" },
  workoutSub: { color: "#047857", fontSize: 13, marginTop: 2 },
  removeWorkoutBtn: { padding: 4 },

  // "Add to Post" Bar
  addToPostContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 20,
  },
  addToPostLabel: { fontSize: 15, fontWeight: "600", color: "#333" },
  addToPostActions: { flexDirection: "row", gap: 16 },
  actionIconBtn: { padding: 4 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#f2f2f7" },
  modalHeader: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalClose: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  workoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
  },
  workoutItemTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  workoutItemSub: { fontSize: 14, color: "#888" },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyListText: {
    textAlign: "center",
    marginTop: 10,
    color: "#888",
    fontSize: 16,
  },
});
