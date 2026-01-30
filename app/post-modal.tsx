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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handlePost = async () => {
    if (!image) {
      Alert.alert(
        "MISSING PHOTO",
        "Every legend needs a photo to prove the grind!",
      );
      return;
    }
    setUploading(true);
    try {
      const newPost: WorkoutPost = {
        id: Date.now().toString(),
        authorId: "temp",
        authorName: "temp",
        message: message,
        imageUri: image,
        createdAt: new Date().toISOString(),
        comments: [],
        reactions: {},
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
      Alert.alert("POST FAILED", error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.modalWrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelBtn}>CANCEL</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NEW POST</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={uploading}
            style={[styles.postBtnContainer, uploading && { opacity: 0.5 }]}
          >
            <Text style={styles.postBtnText}>{uploading ? "..." : "POST"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="What did you crush today?"
              placeholderTextColor={Colors.placeholder}
              multiline
              value={message}
              onChangeText={setMessage}
              autoFocus={!image}
            />
          </View>

          {/* ATTACHED WORKOUT */}
          {selectedWorkout && (
            <View style={styles.attachedWorkoutCard}>
              <View style={styles.workoutIcon}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={24}
                  color={Colors.white}
                />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>
                  {selectedWorkout.name.toUpperCase()}
                </Text>
                <Text style={styles.workoutSub}>
                  {Math.floor(selectedWorkout.duration / 60)}m •{" "}
                  {selectedWorkout.exercises.length} Exercises
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedWorkout(null)}
                style={styles.removeWorkoutBtn}
              >
                <Ionicons name="close-circle" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* IMAGE PREVIEW */}
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
              >
                <Ionicons name="trash" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* 3D MEDIA BUTTONS */}
          {!image && (
            <View style={styles.mediaButtonsContainer}>
              <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                <View
                  style={[styles.iconCircle, { backgroundColor: "#233640" }]}
                >
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.mediaBtnText}>CAMERA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaBtn, { borderBottomColor: "#1899d6" }]}
                onPress={pickFromLibrary}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#233640" }]}
                >
                  <Ionicons name="images" size={32} color={Colors.info} />
                </View>
                <Text style={styles.mediaBtnText}>LIBRARY</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.addWorkoutFooterBtn}
            onPress={() => setWorkoutPickerVisible(true)}
          >
            <MaterialCommunityIcons
              name="dumbbell"
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.addWorkoutFooterText}>
              {selectedWorkout ? "CHANGE WORKOUT" : "ATTACH TODAY'S WORKOUT"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* WORKOUT PICKER */}
      <Modal
        visible={workoutPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.pickerWrapper}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>SELECT WORKOUT</Text>
              <TouchableOpacity onPress={() => setWorkoutPickerVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.textMuted} />
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
                    size={60}
                    color={Colors.border}
                  />
                  <Text style={styles.emptyListText}>
                    No workouts recorded today!
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
                  <View style={styles.workoutItemIcon}>
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={20}
                      color={Colors.gold}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workoutItemTitle}>
                      {item.name.toUpperCase()}
                    </Text>
                    <Text style={styles.workoutItemSub}>
                      {Math.floor(item.duration / 60)}m •{" "}
                      {item.exercises.length} Exercises
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle"
                    size={30}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalWrapper: { flex: 1, backgroundColor: Colors.background, paddingTop: 10 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // REMOVED overflow: 'hidden'
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    // ADDED Radii to Header
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
  },
  cancelBtn: { fontSize: 14, fontWeight: "800", color: Colors.textMuted },
  postBtnContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#46a302",
  },
  postBtnText: { color: Colors.white, fontWeight: "900", fontSize: 14 },

  content: { padding: 20 },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  input: {
    fontSize: 18,
    minHeight: 80,
    color: Colors.text,
    fontWeight: "600",
    textAlignVertical: "top",
  },
  attachedWorkoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  workoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  workoutInfo: { flex: 1 },
  workoutTitle: {
    fontWeight: "900",
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  workoutSub: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
  removeWorkoutBtn: { padding: 4 },
  imageContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  previewImage: { width: "100%", height: 250, resizeMode: "cover" },
  removeImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: Colors.error,
    padding: 8,
    borderRadius: 10,
    borderBottomWidth: 3,
    borderBottomColor: "#a62626",
  },
  mediaButtonsContainer: { flexDirection: "row", gap: 15, marginBottom: 20 },
  mediaBtn: {
    flex: 1,
    height: 130,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  addWorkoutFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  addWorkoutFooterText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 14,
  },

  // Picker Styles
  pickerWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 10,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopWidth: 3,
    borderColor: Colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // REMOVED overflow: 'hidden'
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    // ADDED Radii to Header
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    backgroundColor: Colors.surface, // Ensure it has a background
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
  },
  workoutItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 12,
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  workoutItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutItemTitle: { fontSize: 15, fontWeight: "900", color: Colors.text },
  workoutItemSub: { fontSize: 12, color: Colors.textMuted, fontWeight: "700" },
  emptyState: { alignItems: "center", marginTop: 60, opacity: 0.5 },
  emptyListText: {
    marginTop: 15,
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: "800",
  },
});
