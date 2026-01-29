import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useExerciseStats } from "../../hooks/useExerciseStats";
import AnalyticsChart from "../../components/stats/AnalyticsChart";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { UserProfile, MasterExercise } from "../../constants/types";
import { auth } from "../../config/firebase";
import Colors from "../../constants/Colors";

type ChartMode =
  | "volume"
  | "actual"
  | "estimated"
  | "consistency"
  | "time"
  | "weight";

export default function StatsScreen() {
  // 1. User Selection State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userModalVisible, setUserModalVisible] = useState(false);

  // 2. Exercise Selection
  const [selectedExercise, setSelectedExercise] =
    useState<MasterExercise | null>(null);
  const [exerciseList, setExerciseList] = useState<MasterExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mode, setMode] = useState<ChartMode>("volume");

  // 3. Determine User ID for the hook (Undefined = Me, String = Friend)
  const targetUserId =
    currentUser?.uid === auth.currentUser?.uid ? undefined : currentUser?.uid;

  // 4. USE THE HOOK (Handles both Local and Remote)
  const {
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    bodyWeightData,
    refreshStats,
  } = useExerciseStats(selectedExercise?.name || null, targetUserId);

  // Initial Load
  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    const [users, exercises] = await Promise.all([
      WorkoutRepository.getAllUsers(),
      WorkoutRepository.getMasterExercises(),
    ]);

    setAllUsers(users);
    setExerciseList(exercises);

    // Default to Me
    const me = users.find((u) => u.uid === auth.currentUser?.uid);
    if (me) setCurrentUser(me);

    // Default Exercise
    if (exercises.length > 0) setSelectedExercise(exercises[0]);
  };

  const handleUserSelect = (user: UserProfile) => {
    setCurrentUser(user);
    setUserModalVisible(false);
  };

  // Determine Permissions / Visibility
  const isMe = !targetUserId;
  const showWorkouts = isMe || !currentUser?.privacySettings?.encryptWorkouts;
  const showWeight = isMe || !currentUser?.privacySettings?.encryptBodyWeight;

  // Chart Configuration
  let chartData = [];
  let chartType: "line" | "bar" = "line"; // <--- Explicit Type
  let unit = "";
  let color = Colors.primary;

  switch (mode) {
    case "volume":
      chartData = volumeData;
      unit = "kg";
      color = "#32ADE6";
      break;
    case "actual":
      chartData = maxStrengthData;
      unit = "kg";
      color = "#34C759";
      break;
    case "estimated":
      chartData = oneRMData;
      unit = "kg";
      color = "#FF9500";
      break;
    case "consistency":
      chartData = consistencyData;
      chartType = "bar"; // <--- Bar Chart
      unit = "Workouts";
      color = "#AF52DE";
      break;
    case "time":
      chartData = durationData;
      unit = "mins";
      color = "#FF2D55";
      break;
    case "weight":
      chartData = bodyWeightData;
      unit = "kg";
      color = "#007AFF";
      break;
  }

  // Hide specific exercise modes if user has hidden workouts
  useEffect(() => {
    if (!showWorkouts && mode !== "weight") {
      setMode("weight"); // Fallback if workouts are hidden
    }
  }, [showWorkouts]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity
          style={styles.userSelector}
          onPress={() => setUserModalVisible(true)}
        >
          <Text style={styles.selectorText}>
            {isMe ? "My Stats" : currentUser?.displayName}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshStats} />
        }
      >
        {/* TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          {[
            { key: "volume", label: "Volume", visible: showWorkouts },
            { key: "actual", label: "Max Strength", visible: showWorkouts },
            { key: "estimated", label: "Est. 1RM", visible: showWorkouts },
            { key: "consistency", label: "Consistency", visible: showWorkouts },
            { key: "time", label: "Duration", visible: showWorkouts },
            { key: "weight", label: "Body Weight", visible: showWeight },
          ].map(
            (m) =>
              m.visible && (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.tab, mode === m.key && styles.activeTab]}
                  onPress={() => setMode(m.key as ChartMode)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === m.key && styles.activeTabText,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ),
          )}
        </ScrollView>

        {/* LOCKED STATE */}
        {(!showWorkouts && mode !== "weight") ||
        (!showWeight && mode === "weight") ? (
          <View style={styles.privateCard}>
            <Ionicons name="lock-closed-outline" size={48} color="#ccc" />
            <Text style={styles.privateText}>This data is private.</Text>
          </View>
        ) : (
          <>
            {/* EXERCISE SELECTOR (Only for specific modes) */}
            {["volume", "actual", "estimated"].includes(mode) && (
              <TouchableOpacity
                style={styles.exerciseSelector}
                onPress={() => setPickerVisible(true)}
              >
                <View>
                  <Text style={styles.selectorLabel}>
                    Tracking Analysis For
                  </Text>
                  <Text style={styles.selectorValue}>
                    {selectedExercise?.name || "Select Exercise"}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
            )}

            {/* CHART */}
            <View style={styles.chartContainer}>
              <AnalyticsChart
                data={chartData}
                type={chartType} // <--- Correctly Typed
                color={color}
                unit={unit}
              />
            </View>

            {/* STATS GRID */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Data Points</Text>
                <Text style={styles.statValue}>{chartData.length}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>
                  {mode === "weight" ? "Current" : "Peak"}
                </Text>
                <Text style={styles.statValue}>
                  {chartData.length > 0
                    ? mode === "weight"
                      ? chartData[chartData.length - 1].y
                      : Math.max(...chartData.map((d) => d.y))
                    : "-"}{" "}
                  {unit}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* MODALS */}
      {/* Exercise Picker */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Exercise</Text>
          <TouchableOpacity onPress={() => setPickerVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={exerciseList}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => {
                setSelectedExercise(item);
                setPickerVisible(false);
              }}
            >
              <Text style={styles.pickerItemText}>{item.name}</Text>
              {selectedExercise?.id === item.id && (
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </Modal>

      {/* User Picker */}
      <Modal
        visible={userModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select User</Text>
          <TouchableOpacity onPress={() => setUserModalVisible(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={allUsers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => {
            const isHidden =
              item.privacySettings?.encryptWorkouts &&
              item.privacySettings?.encryptBodyWeight;
            const isSelected = item.uid === currentUser?.uid;
            return (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  isSelected && { backgroundColor: "#f0f9ff" },
                ]}
                onPress={() => handleUserSelect(item)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {/* Avatar Placeholder */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: Colors.primary,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      {item.displayName[0]}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.pickerItemText,
                        isHidden && { color: "#999" },
                      ]}
                    >
                      {item.uid === auth.currentUser?.uid
                        ? "Me"
                        : item.displayName}
                    </Text>
                    {isHidden && (
                      <Text style={{ fontSize: 10, color: "#999" }}>
                        Private Profile
                      </Text>
                    )}
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: Colors.text },
  userSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  selectorText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
  scrollContent: { padding: 16 },

  // Tabs
  tabsContainer: { flexDirection: "row", marginBottom: 16, height: 40 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeTab: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontWeight: "600", color: "#666" },
  activeTabText: { color: "#fff" },

  // Selectors
  exerciseSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  selectorValue: { fontSize: 18, fontWeight: "600", color: "#333" },

  chartContainer: { marginBottom: 16 },

  // Stats Grid
  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#333" },

  // Private Card
  privateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  privateText: { marginTop: 10, color: "#999", fontSize: 16 },

  // Modals
  modalHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  closeText: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerItemText: { fontSize: 16, color: "#333" },
});
