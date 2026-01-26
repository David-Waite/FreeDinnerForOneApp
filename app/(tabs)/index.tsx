import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { WorkoutPost } from "../../constants/types";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // --- FORCE REFRESH ON FOCUS ---
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, []),
  );

  const loadPosts = async () => {
    try {
      const data = await WorkoutRepository.getPosts();
      setPosts(data);
    } catch (e) {
      console.error("Failed to load posts", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item }: { item: WorkoutPost }) => (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.userName ? item.userName[0] : "?"}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.postDate}>
            {new Date(item.date).toLocaleDateString()} at{" "}
            {new Date(item.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      {/* Image */}
      {item.imageUri && (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Ionicons
          name="heart-outline"
          size={24}
          color="#333"
          style={{ marginRight: 16 }}
        />
        <Ionicons
          name="chatbubble-outline"
          size={24}
          color="#333"
          style={{ marginRight: 16 }}
        />
        <Ionicons name="paper-plane-outline" size={24} color="#333" />
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.captionText}>
          <Text style={styles.userName}>{item.userName}</Text> {item.message}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Custom Header to add a Create Post Button */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Social Feed</Text>
          <TouchableOpacity onPress={() => router.push("/post-modal")}>
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        extraData={refreshing} // Helps force update
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet.</Text>
            <Text style={styles.emptySubText}>
              Tap the + button to log your first workout!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  headerSafe: {
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#000" },
  postCard: { backgroundColor: "#fff", marginBottom: 10 },
  postHeader: { flexDirection: "row", alignItems: "center", padding: 12 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary || "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  userName: { fontWeight: "bold", fontSize: 14, color: "#262626" },
  postDate: { color: "#8e8e8e", fontSize: 12 },
  postImage: { width: "100%", height: 400, backgroundColor: "#eee" },
  actionsRow: { flexDirection: "row", padding: 12 },
  captionContainer: { paddingHorizontal: 12, paddingBottom: 16 },
  captionText: { fontSize: 14, lineHeight: 18, color: "#262626" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: { fontWeight: "bold", fontSize: 18, color: "#999", marginTop: 10 },
  emptySubText: { color: "#999", marginTop: 5 },
});
