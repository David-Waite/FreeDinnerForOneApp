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
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { WorkoutTemplate } from "../../constants/types";
import Colors from "../../constants/Colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
    Alert.alert("Delete Template", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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
        <Text style={styles.cardTitle}>{item.name}</Text>
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
              color={Colors.tabIconDefault}
              style={{ marginRight: 15 }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteTemplate(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.cardSubtitle}>{item.exercises.length} Exercises</Text>
      <View style={styles.exercisePreview}>
        {item.exercises.slice(0, 3).map((ex, i) => (
          <Text key={i} style={styles.previewText}>
            • {ex.name}
          </Text>
        ))}
        {item.exercises.length > 3 && (
          <Text style={styles.previewText}>...</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.startBtn}
        // For now, this just goes to the old recorder, we will link this up later
        onPress={() => router.push("/workouts/record")}
      >
        <Text style={styles.startBtnText}>Start Workout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplateItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <Text style={styles.headerTitle}>My Routines</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No templates found.</Text>
            <Text style={styles.emptySubText}>
              Create a routine to get started!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/workouts/template-editor")}
      >
        <Ionicons name="add" size={30} color="#fff" />
        <Text style={styles.fabText}>New Template</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 16 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.text,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardActions: { flexDirection: "row" },
  cardTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text },
  cardSubtitle: { fontSize: 14, color: "#888", marginBottom: 8 },
  exercisePreview: { marginBottom: 16 },
  previewText: { color: "#555", fontSize: 14, marginBottom: 2 },
  startBtn: {
    backgroundColor: "#f0f2f5",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  startBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 16 },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: { color: "#fff", fontWeight: "bold", marginLeft: 8, fontSize: 16 },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#ccc" },
  emptySubText: { fontSize: 14, color: "#ccc", marginTop: 4 },
});
