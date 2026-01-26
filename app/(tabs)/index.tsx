import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// --- IMPORTS ---
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { WorkoutPost } from "../../constants/types";
import Colors from "../../constants/Colors";
import PostCard from "../../components/social/PostCard";
import CommentsModal from "../../components/social/CommentsModal";

export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // --- COMMENTS STATE ---
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<WorkoutPost | null>(null);

  // Load posts whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, []),
  );

  const loadPosts = async () => {
    const data = await WorkoutRepository.getPosts();
    // Sort by newest first
    const sorted = data.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    setPosts(sorted);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleOpenComments = (post: WorkoutPost) => {
    setSelectedPost(post);
    setCommentsVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Community Feed</Text>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push("/post-modal")}
      >
        <Ionicons name="camera-outline" size={26} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onCommentPress={handleOpenComments} />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No posts yet.</Text>
            <Text style={styles.emptySubText}>
              Be the first to share a workout!
            </Text>
          </View>
        }
      />

      {/* Floating Action Button (Alternative to Header Button) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/post-modal")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsVisible}
        post={selectedPost}
        onClose={() => {
          setCommentsVisible(false);
          loadPosts(); // Reload to update comment counts after closing
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  listContent: { paddingBottom: 100 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  iconButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#888",
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: "#aaa",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
