import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { WorkoutRepository } from "../../../services/WorkoutRepository";
import { WorkoutTemplate } from "../../../constants/types";
import Colors from "../../../constants/Colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WorkoutDashboard() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, []),
  );

  const loadTemplates = async () => {
    const data = await WorkoutRepository.getTemplates();
    setTemplates(data);
  };

  const deleteTemplate = async (id: string) => {
    Alert.alert("DELETE ROUTINE", "Ready to drop this training path?", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          await WorkoutRepository.deleteTemplate(id);
          loadTemplates();
        },
      },
    ]);
  };

  const renderTemplateItem = ({ item }: { item: WorkoutTemplate }) => (
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
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() =>
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
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
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
          <Text style={[styles.previewText, { marginLeft: 16, opacity: 0.5 }]}>
            + {item.exercises.length - 3} more
          </Text>
        )}
      </View>

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
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.container}>
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplateItem}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text style={styles.headerSubtitle}>CHOOSE YOUR PATH</Text>
              <Text style={styles.headerTitle}>My Routines</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={60}
                color={Colors.border}
              />
              <Text style={styles.emptyText}>NO ROUTINES YET</Text>
              <Text style={styles.emptySubText}>
                Create a template to unlock faster tracking!
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/workouts/template-editor")}
        >
          <Ionicons name="add" size={30} color={Colors.white} />
          <Text style={styles.fabText}>NEW TEMPLATE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  headerContainer: { marginBottom: 24, marginTop: 10 },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 32, fontWeight: "900", color: Colors.text },

  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6, // Signature Duo 3D Effect
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
    borderBottomColor: "#46a302", // Darker primary green
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
    backgroundColor: Colors.info, // Duo Blue
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
