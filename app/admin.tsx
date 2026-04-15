import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { Calendar } from "react-native-calendars";
import { db } from "../config/firebase";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { UserProfile } from "../constants/types";
import { WorkoutRepository } from "../services/WorkoutRepository";
import AppAlert, { AppAlertButton } from "../components/ui/AppAlert";

export default function AdminScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message?: string; buttons?: AppAlertButton[] } | null>(null);
  const [userPostedDates, setUserPostedDates] = useState<string[]>([]);

  // Form State
  const [postDate, setPostDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [postMessage, setPostMessage] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const userList = snapshot.docs.map(
        (doc) => ({ ...doc.data(), uid: doc.id }) as UserProfile,
      );
      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserCompStatus = async (uid: string, currentStatus: boolean) => {
    const newStatus = currentStatus === false ? true : false;
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, isCompActive: newStatus } : u)),
    );
    try {
      await updateDoc(doc(db, "users", uid), { isCompActive: newStatus });
    } catch (error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, isCompActive: currentStatus } : u,
        ),
      );
    }
  };

  const openBacklogModal = async (user: UserProfile) => {
    setSelectedUser(user);
    setPostDate(new Date().toISOString().split("T")[0]);
    setShowCalendar(false);
    setPostMessage("");
    setPostImage(null);
    setModalVisible(true);

    // Fetch existing posts to disable dates the user already posted on
    try {
      const allPosts = await WorkoutRepository.getPosts();
      const existingDates = allPosts
        .filter((p) => p.authorId === user.uid)
        // Convert to local YYYY-MM-DD to match the calendar format
        .map((p) =>
          new Date(p.createdAt).toLocaleDateString("en-CA", {
            timeZone: "Australia/Melbourne",
          }),
        );

      setUserPostedDates(existingDates);
    } catch (e) {
      console.error("Failed to fetch user posts for calendar", e);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setPostImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setAlertConfig({ title: "PERMISSION DENIED", message: "We need camera access to take a photo!" });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setPostImage(result.assets[0].uri);
  };

  const handleCreateBacklogPost = async () => {
    if (!selectedUser || !postImage || !postMessage || !postDate) {
      setAlertConfig({ title: "MISSING INFO", message: "Please fill out all fields and select an image." });
      return;
    }

    // Double check they didn't manually type/select a disabled date
    if (userPostedDates.includes(postDate)) {
      setAlertConfig({ title: "INVALID DATE", message: "This user already has a post on this date." });
      return;
    }

    setUploading(true);
    try {
      await WorkoutRepository.createAdminBacklogPost(
        selectedUser,
        postDate,
        postMessage,
        postImage,
      );
      setAlertConfig({ title: "SUCCESS", message: `Backlog post created for ${selectedUser.displayName}!` });
      setModalVisible(false);
    } catch (error: any) {
      setAlertConfig({ title: "ERROR", message: error.message });
    } finally {
      setUploading(false);
    }
  };

  // Generate calendar marked dates dynamically
  const markedDates = useMemo(() => {
    const marks: any = {};

    // Disable dates with existing posts
    userPostedDates.forEach((date) => {
      marks[date] = {
        disabled: true,
        disableTouchEvent: true,
        dotColor: Colors.error,
        marked: true,
      };
    });

    // Mark currently selected date
    marks[postDate] = {
      ...marks[postDate],
      selected: true,
      selectedColor: Colors.primary,
      disableTouchEvent: false, // Re-enable if it was somehow disabled but selected
    };

    return marks;
  }, [userPostedDates, postDate]);

  const renderItem = ({ item }: { item: UserProfile }) => {
    const isActive = item.isCompActive !== false;

    return (
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName.toUpperCase()}</Text>
          <Text style={styles.userStatus}>
            Status: {isActive ? "ACTIVE" : "DEACTIVATED"}
          </Text>
        </View>

        <View style={styles.actions}>
          <Switch
            style={{ alignSelf: "center" }}
            value={isActive}
            onValueChange={() =>
              toggleUserCompStatus(item.uid, item.isCompActive ?? true)
            }
            ios_backgroundColor={Colors.placeholder}
          />
          <TouchableOpacity
            style={styles.addPostBtn}
            onPress={() => openBacklogModal(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color={Colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MANAGE USERS</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* BACKLOG POST MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>CANCEL</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>BACKLOG POST</Text>
            <TouchableOpacity
              onPress={handleCreateBacklogPost}
              disabled={uploading}
            >
              <Text style={[styles.submitBtn, uploading && { opacity: 0.5 }]}>
                {uploading ? "..." : "POST"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>POSTING AS:</Text>
            <Text style={styles.targetUser}>
              {selectedUser?.displayName.toUpperCase()}
            </Text>

            <Text style={styles.label}>DATE:</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowCalendar(!showCalendar)}
            >
              <Ionicons name="calendar" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>{postDate}</Text>
            </TouchableOpacity>

            {showCalendar && (
              <View style={styles.calendarContainer}>
                <Calendar
                  current={postDate}
                  onDayPress={(day: any) => {
                    // Prevent selecting disabled days manually
                    if (userPostedDates.includes(day.dateString)) {
                      setAlertConfig({ title: "UNAVAILABLE", message: "User already posted on this date." });
                      return;
                    }
                    setPostDate(day.dateString);
                    setShowCalendar(false);
                  }}
                  markedDates={markedDates}
                  theme={{
                    backgroundColor: Colors.surface,
                    calendarBackground: Colors.surface,
                    textSectionTitleColor: Colors.textMuted,
                    selectedDayBackgroundColor: Colors.primary,
                    selectedDayTextColor: Colors.white,
                    todayTextColor: Colors.primary,
                    dayTextColor: Colors.text,
                    textDisabledColor: Colors.border,
                    arrowColor: Colors.primary,
                    monthTextColor: Colors.text,
                    textMonthFontWeight: "900",
                    textDayFontWeight: "600",
                  }}
                />
              </View>
            )}

            <Text style={styles.label}>MESSAGE:</Text>
            <TextInput
              style={[
                styles.input,
                { minHeight: 80, textAlignVertical: "top" },
              ]}
              value={postMessage}
              onChangeText={setPostMessage}
              placeholder="Crushed it!"
              placeholderTextColor={Colors.placeholder}
              multiline
            />

            <Text style={styles.label}>PHOTO:</Text>
            {postImage ? (
              <View style={styles.imageContainer}>
                <Image source={postImage} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setPostImage(null)}
                >
                  <Ionicons name="trash" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mediaButtonsContainer}>
                <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                  <Text style={styles.mediaBtnText}>CAMERA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mediaBtn, { borderBottomColor: "#1899d6" }]}
                  onPress={pickImage}
                >
                  <Ionicons name="images" size={32} color={Colors.info} />
                  <Text style={[styles.mediaBtnText, { color: Colors.info }]}>
                    LIBRARY
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
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
  listContent: { padding: 16 },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "900", color: Colors.text },
  userStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 4,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },

  /* Styled + Button */
  addPostBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },

  /* Modal Styles */
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: Colors.text },
  cancelBtn: { color: Colors.textMuted, fontWeight: "800" },
  submitBtn: { color: Colors.primary, fontWeight: "900" },
  modalContent: { padding: 20 },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textMuted,
    marginBottom: 8,
    marginTop: 16,
  },
  targetUser: { fontSize: 20, fontWeight: "900", color: Colors.primary },

  /* Calendar & Inputs */
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dateText: { color: Colors.text, fontWeight: "800", fontSize: 16 },
  calendarContainer: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    fontWeight: "600",
    fontSize: 16,
  },

  /* Media Buttons (Camera & Library) */
  mediaButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  mediaBtn: {
    flex: 1,
    height: 100,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  mediaBtnText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  imageContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  previewImage: { width: "100%", height: 200 },
  removeImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: Colors.error,
    padding: 8,
    borderRadius: 10,
  },
});
