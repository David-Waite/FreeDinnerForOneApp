import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import { WorkoutTemplate, UserProfile } from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useWorkoutContext } from "../../../context/WorkoutContext";
import { auth } from "../../../config/firebase";

export default function WorkoutDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext();
  const currentUser = auth.currentUser;

  // --- STATE ---
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.uid || "",
  );
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- LOAD DATA ---
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedUserId]),
  );

  const loadData = async () => {
    try {
      // 1. Fetch Users (for the selector) if not loaded
      if (users.length === 0) {
        const allUsers = await WorkoutRepository.getAllUsers();
        setUsers(allUsers);
      }

      // 2. Fetch Templates based on selection
      if (selectedUserId === currentUser?.uid) {
        // MY Routines (Local Storage)
        const data = await WorkoutRepository.getTemplates();
        setTemplates(data);
      } else {
        // THEIR Public Routines (Firestore)
        const data = await WorkoutRepository.getPublicTemplates(selectedUserId);
        setTemplates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- ACTIONS ---

  const deleteTemplate = async (id: string) => {
    Alert.alert("DELETE ROUTINE", "Ready to drop this training path?", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          await WorkoutRepository.deleteTemplate(id);
          loadData(); // Reload
        },
      },
    ]);
  };

  const stealRoutine = async (template: WorkoutTemplate) => {
    Alert.alert("STEAL ROUTINE", `Add "${template.name}" to your library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Add to Library",
        onPress: async () => {
          const newRoutine = {
            ...template,
            id: Date.now().toString(), // New ID
            isPublic: false, // Make it private by default
          };
          await WorkoutRepository.saveTemplate(newRoutine);
          Alert.alert(
            "Success",
            "Routine added! Switch to 'My Library' to see it.",
          );
        },
      },
    ]);
  };

  // --- RENDERERS ---

  const renderUserSelector = () => {
    // Put current user first
    const sortedUsers = [
      ...users.filter((u) => u.uid === currentUser?.uid),
      ...users.filter((u) => u.uid !== currentUser?.uid),
    ];

    return (
      <View style={styles.selectorContainer}>
        <FlatList
          horizontal
          data={sortedUsers}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => {
            const isSelected = selectedUserId === item.uid;
            const isMe = item.uid === currentUser?.uid;
            return (
              <TouchableOpacity
                style={[styles.userPill, isSelected && styles.userPillSelected]}
                onPress={() => {
                  setLoading(true);
                  setSelectedUserId(item.uid);
                }}
              >
                {item.photoURL ? (
                  <Image
                    source={{ uri: item.photoURL }}
                    style={styles.pillAvatar}
                  />
                ) : (
                  <View style={styles.pillAvatarPlaceholder}>
                    <Text style={styles.pillLetter}>
                      {item.displayName?.[0]}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextSelected,
                  ]}
                >
                  {isMe ? "My Library" : item.displayName.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const renderTemplateItem = ({ item }: { item: WorkoutTemplate }) => {
    const isMine = selectedUserId === currentUser?.uid;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={20}
              color={Colors.gold}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.name.toUpperCase()}</Text>
            <Text style={styles.cardSubtitle}>
              {item.exercises.length} EXERCISES
              {/* Show Public Badge if it's mine */}
              {isMine && item.isPublic && " • PUBLIC"}
            </Text>
          </View>

          {/* ACTIONS */}
          <View style={styles.cardActions}>
            {isMine ? (
              <>
                <TouchableOpacity
                  onPress={() =>
                    // Ensure this path matches your file structure!
                    // If using the modal as discussed: "/template-modal"
                    router.push({
                      pathname: "/workouts/template-editor",
                      params: { id: item.id },
                    })
                  }
                >
                  <Ionicons
                    name="pencil"
                    size={20}
                    color={Colors.textMuted}
                    style={{ marginRight: 15 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTemplate(item.id)}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={Colors.error}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => stealRoutine(item)}>
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.exercisePreview}>
          {item.exercises.slice(0, 3).map((ex, i) => (
            <View key={i} style={styles.previewLine}>
              <View style={styles.dot} />
              <Text style={styles.previewText}>{ex.name}</Text>
            </View>
          ))}
          {item.exercises.length > 3 && (
            <Text
              style={[styles.previewText, { marginLeft: 16, opacity: 0.5 }]}
            >
              + {item.exercises.length - 3} more
            </Text>
          )}
        </View>

        {/* START BUTTON (Only available for my routines for now, or you can allow starting others directly) */}
        {isMine ? (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() =>
              router.push({
                pathname: "/record-workout",
                params: { templateId: item.id },
              })
            }
          >
            <Text style={styles.startBtnText}>START WORKOUT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.startBtn,
              {
                backgroundColor: Colors.surface,
                borderWidth: 2,
                borderColor: Colors.primary,
              },
            ]}
            onPress={() => stealRoutine(item)}
          >
            <Text style={[styles.startBtnText, { color: Colors.primary }]}>
              SAVE COPY TO START
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>CHOOSE YOUR PATH</Text>
        <Text style={styles.headerTitle}>Routines</Text>
      </View>

      {/* USER SELECTOR */}
      {renderUserSelector()}

      {/* LIST */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplateItem}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={60}
                color={Colors.border}
              />
              <Text style={styles.emptyText}>
                {selectedUserId === currentUser?.uid
                  ? "NO ROUTINES YET"
                  : "NO PUBLIC ROUTINES"}
              </Text>
              <Text style={styles.emptySubText}>
                {selectedUserId === currentUser?.uid
                  ? "Create a template to unlock faster tracking!"
                  : "This user hasn't shared any routines yet."}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB (Only Show if viewing "My Library") */}
      {selectedUserId === currentUser?.uid && (
        <TouchableOpacity
          style={styles.fab}
          // Ensure this matches your file name!
          onPress={() => router.push("/workouts/template-editor")}
        >
          <Ionicons name="add" size={30} color={Colors.white} />
          <Text style={styles.fabText}>NEW TEMPLATE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  headerContainer: { marginBottom: 15, marginTop: 10 },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 32, fontWeight: "900", color: Colors.text },

  // Selector Styles
  selectorContainer: { marginBottom: 15, height: 50 },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 8,
  },
  userPillSelected: {
    backgroundColor: Colors.background,
    borderColor: Colors.primary,
  },
  pillAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  pillAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pillLetter: { fontSize: 12, fontWeight: "900", color: Colors.text },
  pillText: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  pillTextSelected: { color: Colors.text },

  // Card Styles
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardActions: { flexDirection: "row", alignItems: "center" },
  exercisePreview: {
    marginBottom: 20,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewLine: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  previewText: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  startBtn: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#46a302",
  },
  startBtnText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.info,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderBottomWidth: 5,
    borderBottomColor: "#1899d6",
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    color: Colors.white,
    fontWeight: "900",
    marginLeft: 8,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 40,
    backgroundColor: Colors.surface,
    padding: 40,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textMuted,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.placeholder,
    marginTop: 4,
    textAlign: "center",
    fontWeight: "600",
  },
});
