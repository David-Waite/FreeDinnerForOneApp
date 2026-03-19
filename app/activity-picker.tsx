import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { CardioActivityType } from "../constants/types";

export default function ActivityPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cardioExpanded, setCardioExpanded] = useState(false);

  const handleCardio = (activityType: CardioActivityType) => {
    router.replace({
      pathname: "/record-cardio",
      params: { activityType },
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      {/* Handle bar */}
      <View style={styles.handle} />

      <Text style={styles.title}>WHAT ARE WE DOING?</Text>
      <Text style={styles.subtitle}>Choose your session type</Text>

      {/* Hypertrophy Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.replace("/workouts/new")}
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.successBackground }]}>
          <MaterialCommunityIcons name="dumbbell" size={28} color={Colors.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>HYPERTROPHY</Text>
          <Text style={styles.cardSubtitle}>Weight training & strength</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Cardio Card */}
      <TouchableOpacity
        style={[styles.card, cardioExpanded && styles.cardActive]}
        activeOpacity={0.85}
        onPress={() => setCardioExpanded((v) => !v)}
      >
        <View style={[styles.iconCircle, { backgroundColor: Colors.errorBackground }]}>
          <MaterialCommunityIcons name="run-fast" size={28} color={Colors.error} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>CARDIO</Text>
          <Text style={styles.cardSubtitle}>Run, walk & more</Text>
        </View>
        <Ionicons
          name={cardioExpanded ? "chevron-down" : "chevron-forward"}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Cardio Sub-options */}
      {cardioExpanded && (
        <View style={styles.subOptions}>
          <TouchableOpacity
            style={styles.subCard}
            activeOpacity={0.85}
            onPress={() => handleCardio("run")}
          >
            <Text style={styles.subIcon}>🏃</Text>
            <View style={styles.cardText}>
              <Text style={styles.subTitle}>RUN</Text>
              <Text style={styles.subSubtitle}>Outdoor or treadmill</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subCard}
            activeOpacity={0.85}
            onPress={() => handleCardio("walk")}
          >
            <Text style={styles.subIcon}>🚶</Text>
            <View style={styles.cardText}>
              <Text style={styles.subTitle}>WALK</Text>
              <Text style={styles.subSubtitle}>Casual or power walk</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>CANCEL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 28,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  cardActive: {
    borderColor: Colors.error,
    borderBottomColor: Colors.error,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 2,
  },
  subOptions: {
    marginLeft: 16,
    marginBottom: 4,
    gap: 8,
  },
  subCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  subIcon: { fontSize: 24, marginRight: 14 },
  subTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  subSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: "auto",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: {
    color: Colors.textMuted,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
});
