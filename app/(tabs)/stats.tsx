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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Import
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useExerciseStats } from "../../hooks/useExerciseStats";
import AnalyticsChart from "../../components/stats/AnalyticsChart";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { UserProfile, MasterExercise } from "../../constants/types";
import { auth } from "../../config/firebase";
import Colors from "../../constants/Colors";
import { useWorkoutContext } from "../../context/WorkoutContext"; // Import

type ChartMode =
  | "volume"
  | "actual"
  | "estimated"
  | "consistency"
  | "time"
  | "weight";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext(); // Get State

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] =
    useState<MasterExercise | null>(null);
  const [exerciseList, setExerciseList] = useState<MasterExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mode, setMode] = useState<ChartMode>("volume");

  const targetUserId =
    currentUser?.uid === auth.currentUser?.uid ? undefined : currentUser?.uid;

  const {
    volumeData,
    oneRMData,
    maxStrengthData,
    durationData,
    consistencyData,
    bodyWeightData,
    refreshStats,
  } = useExerciseStats(selectedExercise?.name || null, targetUserId);

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
    const me = users.find((u) => u.uid === auth.currentUser?.uid);
    if (me) setCurrentUser(me);
    if (exercises.length > 0) setSelectedExercise(exercises[0]);
  };

  const isMe = !targetUserId;
  const showWorkouts = isMe || !currentUser?.privacySettings?.encryptWorkouts;
  const showWeight = isMe || !currentUser?.privacySettings?.encryptBodyWeight;

  let chartData: any[] = [];
  let unit = "";
  let color = Colors.primary;

  switch (mode) {
    case "volume":
      chartData = volumeData;
      unit = "kg";
      color = Colors.info;
      break;
    case "actual":
      chartData = maxStrengthData;
      unit = "kg";
      color = Colors.success;
      break;
    case "estimated":
      chartData = oneRMData;
      unit = "kg";
      color = Colors.gold;
      break;
    case "consistency":
      chartData = consistencyData;
      unit = "days";
      color = Colors.purple;
      break;
    case "time":
      chartData = durationData;
      unit = "min";
      color = Colors.error;
      break;
    case "weight":
      chartData = bodyWeightData;
      unit = "kg";
      color = Colors.primary;
      break;
  }

  return (
    // FIX: Conditional Padding
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>YOUR PROGRESS</Text>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <TouchableOpacity
          style={styles.userSelector}
          onPress={() => setUserModalVisible(true)}
        >
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>
              {currentUser?.displayName?.[0]}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refreshStats}
            tintColor={Colors.primary}
          />
        }
      >
        {/* 2. MODE TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          {[
            { key: "volume", label: "VOLUME", visible: showWorkouts },
            { key: "actual", label: "STRENGTH", visible: showWorkouts },
            { key: "estimated", label: "1RM", visible: showWorkouts },
            { key: "consistency", label: "CONSISTENCY", visible: showWorkouts },
            { key: "time", label: "DURATION", visible: showWorkouts },
            { key: "weight", label: "WEIGHT", visible: showWeight },
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

        {(!showWorkouts && mode !== "weight") ||
        (!showWeight && mode === "weight") ? (
          <View style={styles.privateCard}>
            <MaterialCommunityIcons
              name="shield-lock"
              size={64}
              color={Colors.border}
            />
            <Text style={styles.privateTitle}>PRIVATE LEAGUE</Text>
            <Text style={styles.privateText}>
              This user has locked their stats board.
            </Text>
          </View>
        ) : (
          <>
            {["volume", "actual", "estimated"].includes(mode) && (
              <TouchableOpacity
                style={styles.exerciseSelector}
                onPress={() => setPickerVisible(true)}
              >
                <View>
                  <Text style={styles.selectorLabel}>CURRENT EXERCISE</Text>
                  <Text style={styles.selectorValue}>
                    {selectedExercise?.name || "SELECT..."}
                  </Text>
                </View>
                <View style={styles.selectorIconCircle}>
                  <Ionicons name="search" size={18} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.chartCard}>
              <AnalyticsChart
                data={chartData}
                type="line"
                color={color}
                unit={unit}
              />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>ENTRIES</Text>
                <Text style={styles.statValue}>{chartData.length}</Text>
              </View>
              <View
                style={[styles.statBox, { borderBottomColor: Colors.gold }]}
              >
                <Text style={styles.statLabel}>
                  {mode === "weight" ? "CURRENT" : "PEAK"}
                </Text>
                <Text style={[styles.statValue, { color: Colors.gold }]}>
                  {chartData.length > 0
                    ? mode === "weight"
                      ? chartData[chartData.length - 1].y
                      : Math.max(...chartData.map((d) => d.y))
                    : "-"}
                  {unit}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* USER PICKER MODAL */}
      <Modal
        visible={userModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalWrapper}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT ATHLETE</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allUsers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    item.uid === currentUser?.uid && styles.activePickerItem,
                  ]}
                  onPress={() => {
                    setCurrentUser(item);
                    setUserModalVisible(false);
                  }}
                >
                  <View style={styles.pickerAvatar}>
                    <Text style={styles.pickerAvatarText}>
                      {item.displayName[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerItemText}>
                      {item.uid === auth.currentUser?.uid
                        ? "Me (Champion)"
                        : item.displayName}
                    </Text>
                  </View>
                  {item.uid === currentUser?.uid && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* EXERCISE PICKER MODAL */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalWrapper}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT EXERCISE</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.textMuted} />
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
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={Colors.primary}
                    />
                  )}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: Colors.text },
  userSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 8,
    borderRadius: 12,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  smallAvatarText: { color: Colors.white, fontSize: 12, fontWeight: "900" },
  scrollContent: { padding: 16 },
  tabsContainer: { marginBottom: 20 },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
  },
  activeTab: { backgroundColor: Colors.primary, borderBottomColor: "#46a302" },
  tabText: { fontWeight: "900", color: Colors.textMuted, fontSize: 12 },
  activeTabText: { color: Colors.white },
  exerciseSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.placeholder,
    letterSpacing: 1,
  },
  selectorValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 4,
  },
  selectorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderBottomWidth: 5,
    borderBottomColor: Colors.border,
  },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 30 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.placeholder,
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: Colors.text },
  privateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    borderBottomWidth: 5,
    borderBottomColor: Colors.border,
  },
  privateTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  privateText: {
    marginTop: 5,
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  modalWrapper: { flex: 1, backgroundColor: Colors.background, paddingTop: 10 },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopWidth: 3,
    borderColor: Colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
  },
  pickerItem: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activePickerItem: {
    borderColor: Colors.primary,
    borderBottomColor: "#46a302",
    borderWidth: 2,
  },
  pickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerAvatarText: { color: Colors.white, fontWeight: "900", fontSize: 18 },
  pickerItemText: { fontSize: 16, fontWeight: "800", color: Colors.text },
});
