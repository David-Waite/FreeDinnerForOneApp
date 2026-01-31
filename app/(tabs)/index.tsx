import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- IMPORTS ---
import { useWorkoutContext } from "../../context/WorkoutContext"; // IMPORT THIS
import { WorkoutRepository } from "../../services/WorkoutRepository";
import { WorkoutPost } from "../../constants/types";
import Colors from "../../constants/Colors";
import PostCard from "../../components/social/PostCard";
import CommentsModal from "../../components/social/CommentsModal";
import WorkoutDetailsModal from "../../components/social/WorkoutDetailsModal";
import DuoTouch from "../../components/ui/DuoTouch";

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isActive } = useWorkoutContext(); // GET ACTIVE STATE

  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewWorkoutId, setViewWorkoutId] = useState<string | null>(null);
  const [viewWorkoutAuthorId, setViewWorkoutAuthorId] = useState<string | null>(
    null,
  );
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<WorkoutPost | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, []),
  );

  const loadPosts = async () => {
    const data = await WorkoutRepository.getPosts();
    const sorted = data.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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

  const handleOpenWorkout = (workoutId: string, authorId: string) => {
    setViewWorkoutId(workoutId);
    setViewWorkoutAuthorId(authorId);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.headerSubtitle}>GLOBAL LEAGUE</Text>
        <Text style={styles.headerTitle}>Feed</Text>
      </View>

      <DuoTouch
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
        hapticStyle="light"
      >
        <Ionicons name="settings-sharp" size={22} color={Colors.primary} />
      </DuoTouch>
    </View>
  );

  return (
    // FIX: If active, padding is 0 (Banner handles it). If not, use inset.
    <View style={[styles.container, { paddingTop: isActive ? 0 : insets.top }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postWrapper}>
            <PostCard
              post={item}
              onCommentPress={handleOpenComments}
              onWorkoutPress={(workoutId) =>
                handleOpenWorkout(workoutId, item.authorId)
              }
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="account-group"
              size={64}
              color={Colors.border}
            />
            <Text style={styles.emptyText}>NO ACTIVITY YET</Text>
            <Text style={styles.emptySubText}>
              Your league is quiet. Be the champion and share your first
              workout!
            </Text>
          </View>
        }
      />

      <CommentsModal
        visible={commentsVisible}
        post={selectedPost}
        onClose={() => {
          setCommentsVisible(false);
          loadPosts();
        }}
      />

      <WorkoutDetailsModal
        visible={!!viewWorkoutId}
        workoutId={viewWorkoutId}
        onClose={() => setViewWorkoutId(null)}
        authorId={viewWorkoutAuthorId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 100 },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.text,
    marginTop: -4,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  postWrapper: {
    marginBottom: 16,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 40,
    padding: 40,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },
});
