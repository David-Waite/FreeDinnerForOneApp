import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  InteractionManager, // <--- 1. IMPORT THIS
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { WorkoutRepository } from "../services/WorkoutRepository";
import { WorkoutPost, WorkoutSession, CardioSession } from "../constants/types";
import { useWorkoutContext } from "../context/WorkoutContext";
import DuoTouch from "../components/ui/DuoTouch";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const CARDIO_CONFIG = {
  run:   { label: "RUN",   icon: "run-fast" as const, color: Colors.error,   borderColor: "#a62626", bgColor: Colors.errorBackground },
  walk:  { label: "WALK",  icon: "walk"     as const, color: Colors.info,    borderColor: "#1a6b99", bgColor: "#1a3a4d" },
  cycle: { label: "CYCLE", icon: "bike"     as const, color: Colors.warning, borderColor: "#cc7a00", bgColor: "#4d3a00" },
};

type SessionPickerItem =
  | { kind: "workout"; data: WorkoutSession }
  | { kind: "cardio";  data: CardioSession }
  | { kind: "header";  title: string };

export default function PostModal() {
  const router = useRouter();

  // 1. Get Game Status from Context
  const { gameStatus, refreshGameStatus } = useWorkoutContext();
  const [isDeactivated, setIsDeactivated] = useState(false);
  // 2. Derive Logic
  const canPost =
    !isDeactivated && gameStatus.canPostToday && gameStatus.remaining > 0;

  // 3. Derive Status Message
  let statusMsg = "";
  if (isDeactivated) {
    statusMsg = "Deactivated from comp. Contact Admin.";
  } else if (!gameStatus.canPostToday) {
    statusMsg = "You have already posted today! Come back tomorrow.";
  } else if (gameStatus.remaining <= 0) {
    if (gameStatus.score >= gameStatus.cap) {
      statusMsg = `Weekly cap (${gameStatus.cap}) reached! Great work.`;
    } else {
      statusMsg = "Not enough days left in the week to add more points.";
    }
  } else {
    statusMsg = `${gameStatus.remaining} workouts possible this week.`;
  }

  // Form State
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);
  const [selectedCardio, setSelectedCardio] = useState<CardioSession | null>(null);
  const [todaysWorkouts, setTodaysWorkouts] = useState<WorkoutSession[]>([]);
  const [todaysCardioSessions, setTodaysCardioSessions] = useState<CardioSession[]>([]);
  const [workoutPickerVisible, setWorkoutPickerVisible] = useState(false);

  useEffect(() => {
    loadTodaysSessions();
    refreshGameStatus();
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().isCompActive === false) {
      setIsDeactivated(true);
    }
  };

  const loadTodaysSessions = async () => {
    const today = new Date().toDateString();
    const [allWorkouts, allCardio] = await Promise.all([
      WorkoutRepository.getWorkouts(),
      WorkoutRepository.getCardioSessions(),
    ]);
    setTodaysWorkouts(allWorkouts.filter((w) => new Date(w.date).toDateString() === today));
    setTodaysCardioSessions(allCardio.filter((c) => new Date(c.date).toDateString() === today));
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
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
    if (!canPost) {
      Alert.alert("Limit Reached", statusMsg);
      return;
    }

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
        sessionId: selectedWorkout?.id ?? selectedCardio?.id,
        workoutSummary: selectedWorkout
          ? {
              id: selectedWorkout.id,
              name: selectedWorkout.name,
              duration: selectedWorkout.duration,
              exerciseCount: selectedWorkout.exercises.length,
            }
          : undefined,
        cardioSummary: selectedCardio
          ? {
              id: selectedCardio.id,
              activityType: selectedCardio.activityType,
              duration: selectedCardio.duration,
              distance: selectedCardio.distance,
              pace: selectedCardio.pace,
            }
          : undefined,
      };

      // 1. Perform Network Request
      await WorkoutRepository.createPost(newPost);

      // 2. TRIGGER NAVIGATION IMMEDIATELY
      // We close the modal *before* asking the rest of the app to re-render.
      router.back();

      // 3. DEFER THE HEAVY GLOBAL UPDATE
      // InteractionManager waits until the close animation is fully complete
      // before firing the global context update.
      InteractionManager.runAfterInteractions(() => {
        refreshGameStatus();
      });
    } catch (error: any) {
      Alert.alert("POST FAILED", error.message);
      setUploading(false); // Only stop loading if we failed and stayed on screen
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
            disabled={uploading || !canPost}
            style={[
              styles.postBtnContainer,
              (uploading || !canPost) && {
                opacity: 0.5,
                backgroundColor: "#ccc",
                borderBottomColor: "#999",
              },
            ]}
          >
            <Text style={styles.postBtnText}>{uploading ? "..." : "POST"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.statusBanner,
              canPost ? styles.statusGreen : styles.statusRed,
            ]}
          >
            <Ionicons
              name={canPost ? "sparkles" : "lock-closed"}
              size={22}
              color={canPost ? Colors.primary : Colors.error}
            />
            <Text
              style={[
                styles.statusText,
                canPost ? styles.textGreen : styles.textRed,
              ]}
            >
              {statusMsg.toUpperCase()}
            </Text>
          </View>

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

          {selectedWorkout && (
            <View style={styles.attachedWorkoutCard}>
              <View style={styles.workoutIcon}>
                <MaterialCommunityIcons name="dumbbell" size={24} color={Colors.white} />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{selectedWorkout.name.toUpperCase()}</Text>
                <Text style={styles.workoutSub}>
                  {Math.floor(selectedWorkout.duration / 60)}m • {selectedWorkout.exercises.length} Exercises
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedWorkout(null)} style={styles.removeWorkoutBtn}>
                <Ionicons name="close-circle" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {selectedCardio && (() => {
            const cfg = CARDIO_CONFIG[selectedCardio.activityType];
            return (
              <View style={[styles.attachedWorkoutCard, { backgroundColor: cfg.color, borderBottomColor: cfg.borderColor }]}>
                <View style={styles.workoutIcon}>
                  <MaterialCommunityIcons name={cfg.icon} size={24} color={Colors.white} />
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutTitle}>{cfg.label} SESSION</Text>
                  <Text style={styles.workoutSub}>
                    {selectedCardio.distance.toFixed(2)}km • {Math.floor(selectedCardio.duration / 60)}m
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCardio(null)} style={styles.removeWorkoutBtn}>
                  <Ionicons name="close-circle" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* IMAGE PREVIEW */}
          {image && (
            <View style={styles.imageContainer}>
              <Image
                source={image}
                style={styles.previewImage}
                contentFit="cover"
                transition={300}
                cachePolicy="disk"
              />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImage(null)}
              >
                <Ionicons name="trash" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* MEDIA BUTTONS */}
          {!image && (
            <View style={styles.mediaButtonsContainer}>
              <DuoTouch
                style={styles.mediaBtn}
                onPress={takePhoto}
                hapticStyle="medium"
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#233640" }]}
                >
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.mediaBtnText}>CAMERA</Text>
              </DuoTouch>

              <DuoTouch
                style={[styles.mediaBtn, { borderBottomColor: "#1899d6" }]}
                onPress={pickFromLibrary}
                hapticStyle="medium"
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: "#233640" }]}
                >
                  <Ionicons name="images" size={32} color={Colors.info} />
                </View>
                <Text style={styles.mediaBtnText}>LIBRARY</Text>
              </DuoTouch>
            </View>
          )}

          <TouchableOpacity
            style={styles.addWorkoutFooterBtn}
            onPress={() => setWorkoutPickerVisible(true)}
          >
            <MaterialCommunityIcons
              name={selectedCardio ? CARDIO_CONFIG[selectedCardio.activityType].icon : "dumbbell"}
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.addWorkoutFooterText}>
              {selectedWorkout || selectedCardio ? "CHANGE ACTIVITY" : "ATTACH TODAY'S ACTIVITY"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={workoutPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.pickerWrapper}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>SELECT ACTIVITY</Text>
              <TouchableOpacity onPress={() => setWorkoutPickerVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={((): SessionPickerItem[] => [
                ...(todaysWorkouts.length > 0 ? [{ kind: "header" as const, title: "STRENGTH" }] : []),
                ...todaysWorkouts.map((w) => ({ kind: "workout" as const, data: w })),
                ...(todaysCardioSessions.length > 0 ? [{ kind: "header" as const, title: "CARDIO" }] : []),
                ...todaysCardioSessions.map((c) => ({ kind: "cardio" as const, data: c })),
              ])()}
              keyExtractor={(item) =>
                item.kind === "header" ? item.title : item.data.id
              }
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="dumbbell" size={60} color={Colors.border} />
                  <Text style={styles.emptyListText}>No activities recorded today!</Text>
                </View>
              }
              renderItem={({ item }) => {
                if (item.kind === "header") {
                  return <Text style={styles.pickerSectionHeader}>{item.title}</Text>;
                }
                if (item.kind === "workout") {
                  return (
                    <TouchableOpacity
                      style={styles.workoutItem}
                      onPress={() => {
                        setSelectedWorkout(item.data);
                        setSelectedCardio(null);
                        setWorkoutPickerVisible(false);
                      }}
                    >
                      <View style={styles.workoutItemIcon}>
                        <MaterialCommunityIcons name="lightning-bolt" size={20} color={Colors.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workoutItemTitle}>{item.data.name.toUpperCase()}</Text>
                        <Text style={styles.workoutItemSub}>
                          {Math.floor(item.data.duration / 60)}m • {item.data.exercises.length} Exercises
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={30} color={Colors.primary} />
                    </TouchableOpacity>
                  );
                }
                // cardio
                const cfg = CARDIO_CONFIG[item.data.activityType];
                return (
                  <TouchableOpacity
                    style={styles.workoutItem}
                    onPress={() => {
                      setSelectedCardio(item.data);
                      setSelectedWorkout(null);
                      setWorkoutPickerVisible(false);
                    }}
                  >
                    <View style={[styles.workoutItemIcon, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
                      <MaterialCommunityIcons name={cfg.icon} size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workoutItemTitle}>{cfg.label} SESSION</Text>
                      <Text style={styles.workoutItemSub}>
                        {item.data.distance.toFixed(2)}km • {Math.floor(item.data.duration / 60)}m
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={30} color={cfg.color} />
                  </TouchableOpacity>
                );
              }}
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
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
  previewImage: { width: "100%", height: 250 },
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
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
    backgroundColor: Colors.surface,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
  },
  pickerSectionHeader: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    gap: 12,
  },
  statusGreen: {
    backgroundColor: "#233610",
    borderColor: Colors.primary,
    borderBottomColor: "#46a302",
  },
  statusRed: {
    backgroundColor: "#3b1717",
    borderColor: Colors.error,
    borderBottomColor: "#a62626",
  },
  statusText: {
    fontWeight: "800",
    fontSize: 13,
    flex: 1,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  textGreen: {
    color: Colors.primary,
  },
  textRed: {
    color: Colors.error,
  },
});
