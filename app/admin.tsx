import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { UserProfile } from "../constants/types";

export default function AdminScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Treat undefined as true by default
    const newStatus = currentStatus === false ? true : false;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, isCompActive: newStatus } : u)),
    );

    try {
      await updateDoc(doc(db, "users", uid), { isCompActive: newStatus });
    } catch (error) {
      console.error("Failed to update status", error);
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, isCompActive: currentStatus } : u,
        ),
      );
    }
  };

  const renderItem = ({ item }: { item: UserProfile }) => {
    // If undefined, we assume they are active
    const isActive = item.isCompActive !== false;

    return (
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName.toUpperCase()}</Text>
          <Text style={styles.userStatus}>
            Status: {isActive ? "ACTIVE" : "DEACTIVATED"}
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={() =>
            toggleUserCompStatus(item.uid, item.isCompActive ?? true)
          }
          trackColor={{ false: Colors.error, true: Colors.primary }}
          ios_backgroundColor={Colors.error}
        />
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
});
