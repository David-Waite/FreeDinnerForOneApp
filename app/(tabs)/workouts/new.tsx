import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import { WorkoutTemplate, UserProfile } from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useWorkoutContext } from "../../../context/WorkoutContext";
import { auth } from "../../../config/firebase";
import DuoTouch from "../../../components/ui/DuoTouch";

export default function WorkoutDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext();
  const currentUser = auth.currentUser;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.uid || "",
  );
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedUserId]),
  );

  const loadData = async () => {
    try {
      if (users.length === 0) {
        const allUsers = await WorkoutRepository.getAllUsers();
        setUsers(allUsers);
      }

      if (selectedUserId === currentUser?.uid) {
        const data = await WorkoutRepository.getTemplates();
        setTemplates(data);
      } else {
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

  const deleteTemplate = async (id: string) => {
    Alert.alert("DELETE ROUTINE", "Ready to drop this training path?", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          await WorkoutRepository.deleteTemplate(id);
          loadData();
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
            id: Date.now().toString(),
            isPublic: false,
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

  const renderUserSelector = () => {
    const sortedUsers = [
      ...users.filter((u) => u.uid === currentUser?.uid),
      ...users.filter((u) => u.uid !== currentUser?.uid),
    ];

    return (
      <View style={styles.selectorContainer}>
        <FlatList
          horizontal
          data={sortedUsers}
          extraData={selectedUserId}
          renderItem={({ item }) => {
            const isSelected = selectedUserId === item.uid;
            const isMe = item.uid === currentUser?.uid;
            return (
              <DuoTouch
                style={[styles.userPill, isSelected && styles.userPillSelected]}
                hapticStyle="light"
                onPress={() => {
                  if (selectedUserId === item.uid) return;
                  setLoading(true);
                  setSelectedUserId(item.uid);
                }}
              >
                {item.photoURL ? (
                  <Image
                    source={item.photoURL}
                    style={styles.pillAvatar}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
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
              </DuoTouch>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorContent}
          keyExtractor={(item) => item.uid}
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
              {isMine && item.isPublic && " • PUBLIC"}
            </Text>
          </View>

          <View style={styles.cardActions}>
            {isMine ? (
              <View style={styles.actionRow}>
                <DuoTouch
                  onPress={() =>
                    router.push({
                      pathname: "/workouts/template-editor",
                      params: { id: item.id },
                    })
                  }
                  hapticStyle="light"
                >
                  <Ionicons name="pencil" size={20} color={Colors.textMuted} />
                </DuoTouch>

                <DuoTouch
                  onPress={() => deleteTemplate(item.id)}
                  hapticStyle="medium" // Or use "error" for a distinct double-pulse
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={Colors.error}
                  />
                </DuoTouch>
              </View>
            ) : (
              <DuoTouch
                style={styles.stealAction}
                onPress={() => stealRoutine(item)}
                hapticStyle="medium"
              >
                <Ionicons
                  name="cloud-download"
                  size={22}
                  color={Colors.primary}
                />
              </DuoTouch>
            )}
          </View>
        </View>

        <View style={styles.exercisePreview}>
          {item.exercises.slice(0, 3).map((ex, i) => (
            <View key={i} style={styles.previewLine}>
              <View style={styles.dot} />
              <Text style={styles.previewText} numberOfLines={1}>
                {ex.name}
              </Text>
            </View>
          ))}
          {item.exercises.length > 3 && (
            <Text style={styles.moreText}>
              + {item.exercises.length - 3} more
            </Text>
          )}
        </View>

        {isMine ? (
          <DuoTouch
            style={styles.startBtn}
            hapticStyle="heavy" // Heavy slam for starting the mission
            onPress={() =>
              router.push({
                pathname: "/record-workout",
                params: { templateId: item.id },
              })
            }
          >
            <Text style={styles.startBtnText}>START WORKOUT</Text>
          </DuoTouch>
        ) : (
          <DuoTouch
            style={styles.downloadBtn}
            hapticStyle="medium" // Medium click for adding to library
            onPress={() => stealRoutine(item)}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
            <Text style={styles.downloadBtnText}>ADD TO MY LIBRARY</Text>
          </DuoTouch>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerSubtitle}>CHOOSE YOUR PATH</Text>
        <Text style={styles.headerTitle}>Routines</Text>
      </View>

      {renderUserSelector()}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplateItem}
          contentContainerStyle={styles.listContent}
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

      {selectedUserId === currentUser?.uid && (
        <DuoTouch
          style={styles.fab}
          onPress={() => router.push("/workouts/template-editor")}
          hapticStyle="heavy"
        >
          <Ionicons name="add" size={30} color={Colors.white} />
          <Text style={styles.fabText}>NEW TEMPLATE</Text>
        </DuoTouch>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerContainer: { paddingHorizontal: 16, marginBottom: 15, marginTop: 10 },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 32, fontWeight: "900", color: Colors.text },

  // User Selector Styles
  selectorContainer: { height: 60, marginBottom: 10 },
  selectorContent: { paddingHorizontal: 16, alignItems: "center", gap: 10 },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.border,
    height: 44,
  },
  userPillSelected: {
    backgroundColor: Colors.background,
    borderColor: Colors.primary,
    borderBottomWidth: 4, // Duo depth
  },
  pillAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  pillAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pillLetter: { fontSize: 12, fontWeight: "900", color: Colors.text },
  pillText: { fontSize: 13, fontWeight: "800", color: Colors.textMuted },
  pillTextSelected: { color: Colors.text },

  // Card Styles
  listContent: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 10 },
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
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardActions: { justifyContent: "center" },
  actionRow: { flexDirection: "row", gap: 15, alignItems: "center" },
  stealAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

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
  previewText: { color: Colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  moreText: {
    marginLeft: 16,
    opacity: 0.5,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },

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
  downloadBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: Colors.primary,
  },
  downloadBtnText: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  loader: { marginTop: 50 },
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
    elevation: 5,
  },
  fabText: {
    color: Colors.white,
    fontWeight: "900",
    marginLeft: 8,
    fontSize: 14,
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
