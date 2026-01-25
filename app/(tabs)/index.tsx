import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { WorkoutPost } from "../../constants/types";
import Colors from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function FeedScreen() {
  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = async () => {
    const data = await WorkoutRepository.getPosts();
    setPosts(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, []),
  );

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
          <Text style={styles.avatarText}>{item.userName[0]}</Text>
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

      {/* Actions (Like/Comment - Visual only for now) */}
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
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  postCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  userName: { fontWeight: "bold", fontSize: 14, color: "#262626" },
  postDate: { color: "#8e8e8e", fontSize: 12 },

  postImage: { width: "100%", height: 400 },

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
