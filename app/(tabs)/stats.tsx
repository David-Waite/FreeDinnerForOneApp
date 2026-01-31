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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useExerciseStats } from "../../hooks/useExerciseStats";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { UserProfile, MasterExercise } from "../../constants/types";
import { auth } from "../../config/firebase";
import Colors from "../../constants/Colors";
import { useWorkoutContext } from "../../context/WorkoutContext";
import AnalyticsMiniCard from "../../components/stats/AnalyticsMiniCard";

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] =
    useState<MasterExercise | null>(null);
  const [exerciseList, setExerciseList] = useState<MasterExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

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

  const navigateToDetail = (mode: string) => {
    router.push({
      pathname: "/stats-detail",
      params: {
        mode,
        exerciseName: selectedExercise?.name,
        targetUserId: targetUserId,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      {/* 1. HEADER */}
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
        {!showWorkouts && !showWeight ? (
          <View style={styles.privateCard}>
            <MaterialCommunityIcons
              name="shield-lock"
              size={64}
              color={Colors.border}
            />
            <Text style={styles.privateTitle}>PRIVATE LEAGUE</Text>
            <Text style={styles.privateText}>
              This athlete has hidden their statistics.
            </Text>
          </View>
        ) : (
          <>
            {/* 2. EXERCISE SELECTOR */}
            {showWorkouts && (
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

            {/* 3. MINI STATS GRID */}
            <Text style={styles.sectionHeader}>INSIGHTS & PERFORMANCE</Text>
            <View style={styles.grid}>
              {showWorkouts && (
                <>
                  <AnalyticsMiniCard
                    title="Volume"
                    data={volumeData}
                    type="line"
                    color={Colors.info}
                    unit="kg"
                    onPress={() => navigateToDetail("volume")}
                  />
                  <AnalyticsMiniCard
                    title="Strength"
                    data={maxStrengthData}
                    type="line"
                    color={Colors.success}
                    unit="kg"
                    onPress={() => navigateToDetail("actual")}
                  />
                  <AnalyticsMiniCard
                    title="Est. 1RM"
                    data={oneRMData}
                    type="line"
                    color={Colors.gold}
                    unit="kg"
                    onPress={() => navigateToDetail("estimated")}
                  />
                  <AnalyticsMiniCard
                    title="Consistency"
                    data={consistencyData}
                    type="grid"
                    color={Colors.purple}
                    unit="days"
                    onPress={() => navigateToDetail("consistency")}
                  />
                  <AnalyticsMiniCard
                    title="Duration"
                    data={durationData}
                    type="bar"
                    color={Colors.error}
                    unit="min"
                    onPress={() => navigateToDetail("time")}
                  />
                </>
              )}
              {showWeight && (
                <AnalyticsMiniCard
                  title="Weight"
                  data={bodyWeightData}
                  type="line"
                  color={Colors.primary}
                  unit="kg"
                  onPress={() => navigateToDetail("weight")}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* MODALS (EXERCISE & USER PICKERS) */}
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
                        ? "Me"
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
  exerciseSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
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
