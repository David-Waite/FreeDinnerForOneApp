import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutPost, ReactionDetail } from "../../constants/types"; // Updated Import
import { WorkoutRepository } from "../../services/WorkoutRepository";
import ReactionPicker from "./ReactionPicker";
import Colors from "../../constants/Colors";
import { auth } from "../../config/firebase";
import DuoTouch from "../ui/DuoTouch";

// --- HELPER FUNCTION ---
const getRelativeTime = (timestamp: any) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 10) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
};

type Props = {
  post: WorkoutPost;
  onCommentPress: (post: WorkoutPost) => void;
  onWorkoutPress: (workoutId: string) => void;
};

export default function PostCard({
  post,
  onCommentPress,
  onWorkoutPress,
}: Props) {
  // State for legacy map (uid -> emoji)
  const [reactions, setReactions] = useState<Record<string, string>>(
    post.reactions || {},
  );
  // State for rich data (uid -> ReactionDetail)
  const [reactionDetails, setReactionDetails] = useState<
    Record<string, ReactionDetail>
  >(post.reactionData || {});

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const heartButtonRef =
    useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const currentUserId = auth.currentUser?.uid;

  // Process Reactions for Display
  const reactionGroups = useMemo(() => {
    const groups: Record<string, { count: number; avatars: string[] }> = {};

    // Iterate over the keys (User IDs)
    Object.keys(reactions).forEach((uid) => {
      const emoji = reactions[uid];
      const detail = reactionDetails[uid];

      if (!groups[emoji]) {
        groups[emoji] = { count: 0, avatars: [] };
      }

      groups[emoji].count += 1;

      // Add avatar if available (and limit to 3 per emoji type to prevent clutter)
      if (detail?.userAvatar && groups[emoji].avatars.length < 3) {
        groups[emoji].avatars.push(detail.userAvatar);
      }
    });

    return groups;
  }, [reactions, reactionDetails]);

  const myReactionEmoji = currentUserId ? reactions[currentUserId] : undefined;

  // Calculate Comment Count
  const commentCount = useMemo(() => {
    if (!post.comments) return 0;
    return post.comments.reduce((total, comment) => {
      // Count the comment itself + any replies
      return total + 1 + (comment.replies?.length || 0);
    }, 0);
  }, [post.comments]);

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;

    // Optimistic / Actual Update
    const result = await WorkoutRepository.toggleReaction(post.id, emoji);

    if (result) {
      setReactions(result.reactions);
      setReactionDetails(result.reactionData);
    }
  };

  const handleLongPress = () => {
    heartButtonRef.current?.measureInWindow((x, y, width, height) => {
      setPickerPos({ x: x + width / 2, y: y - 15 });
      setPickerVisible(true);
    });
  };

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        {post.authorAvatar ? (
          <Image
            source={post.authorAvatar}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.authorName?.[0] || "?"}</Text>
          </View>
        )}
        <View>
          <Text style={styles.userName}>{post.authorName}</Text>
          <Text style={styles.date}>{getRelativeTime(post.createdAt)}</Text>
        </View>
      </View>

      {/* WORKOUT BANNER */}
      {post.workoutSummary && (
        <View style={styles.workoutContainer}>
          <TouchableOpacity
            style={styles.workoutBanner}
            onPress={() => onWorkoutPress(post.workoutSummary!.id)}
            activeOpacity={0.8}
          >
            <View style={styles.workoutIcon}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={20}
                color={Colors.white}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workoutTitle}>
                {post.workoutSummary.name.toUpperCase()}
              </Text>
              <Text style={styles.workoutSub}>
                {Math.floor(post.workoutSummary.duration / 60)}m •{" "}
                {post.workoutSummary.exerciseCount} Exercises
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENT & CAPTION */}
      <View style={styles.content}>
        <Text style={styles.caption}>
          <Text style={styles.boldName}>{post.authorName}</Text> {post.message}
        </Text>
      </View>

      {/* POST IMAGE */}
      {post.imageUri && (
        <View style={styles.imageWrapper}>
          <Image
            source={post.imageUri}
            style={styles.postImage}
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
          />
        </View>
      )}

      {/* REACTION BADGES */}
      {/* COMPACT REACTION TILES */}
      {Object.keys(reactions).length > 0 && (
        <View style={styles.compactReactionRow}>
          {Object.keys(reactions).map((uid) => {
            const emoji = reactions[uid];
            const detail = reactionDetails[uid];

            return (
              <View key={uid} style={styles.compactTileWrapper}>
                {/* THE USER SQUIRCLE */}
                <View style={styles.miniSquircleBase}>
                  {detail?.userAvatar ? (
                    <Image
                      source={detail.userAvatar}
                      style={styles.miniSquircleImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[styles.miniSquircleImage, styles.miniPlaceholder]}
                    >
                      <Text style={styles.miniLetter}>
                        {detail?.userName?.[0] || "?"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* THE EMOJI BADGE (Top Right) */}
                <View style={styles.emojiBadgeOverlay}>
                  <Text style={styles.emojiBadgeText}>{emoji}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ACTION BAR */}
      <View style={styles.actionBar}>
        {/* LIKE BUTTON */}
        <DuoTouch
          ref={heartButtonRef}
          style={[
            styles.actionButton,
            myReactionEmoji && styles.activeActionButton,
          ]}
          onPress={() => handleReaction("❤️")}
          onLongPress={handleLongPress}
          hapticStyle={myReactionEmoji ? "light" : "medium"}
        >
          <Ionicons
            name={myReactionEmoji ? "heart" : "heart-outline"}
            size={22}
            color={myReactionEmoji ? Colors.white : Colors.textMuted}
          />
          <Text
            style={[
              styles.actionText,
              myReactionEmoji && { color: Colors.white },
            ]}
          >
            LIKE
          </Text>
        </DuoTouch>

        {/* COMMENT BUTTON */}
        <DuoTouch
          style={styles.actionButton}
          onPress={() => onCommentPress(post)}
          hapticStyle="light"
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={Colors.textMuted}
          />
          <Text style={styles.actionText}>
            {commentCount > 0 ? `${commentCount} ` : ""}COMMENT
            {commentCount > 0 ? "S" : ""}
          </Text>
        </DuoTouch>
      </View>

      <ReactionPicker
        visible={pickerVisible}
        position={pickerPos}
        onClose={() => setPickerVisible(false)}
        onSelect={handleReaction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: { color: Colors.textLight, fontWeight: "800", fontSize: 18 },
  userName: { fontWeight: "800", fontSize: 16, color: Colors.text },
  date: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },
  content: { paddingHorizontal: 16, marginBottom: 12 },
  caption: { fontSize: 15, lineHeight: 22, color: Colors.text },
  boldName: { fontWeight: "800", color: Colors.primary },
  workoutContainer: { paddingHorizontal: 16, marginBottom: 16 },
  workoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 15,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  workoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  workoutTitle: {
    fontWeight: "900",
    fontSize: 13,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  workoutSub: { color: Colors.textMuted, fontSize: 12, fontWeight: "700" },
  imageWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  postImage: { width: "100%", height: 250 },
  actionBar: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    justifyContent: "space-around",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  activeActionButton: {
    backgroundColor: Colors.error,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textMuted,
  },
  compactReactionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10, // Space between tiles
  },
  compactTileWrapper: {
    position: "relative",
    width: 42, // Total width of the tile
    height: 42,
  },
  miniSquircleBase: {
    width: 40,
    height: 40,
    backgroundColor: Colors.border, // The 3D shadow color
    borderRadius: 10,
    paddingBottom: 3, // Creates the 3D lift
  },
  miniSquircleImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  miniPlaceholder: {
    backgroundColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  miniLetter: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.textMuted,
  },
  emojiBadgeOverlay: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.surface,
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    // Add a tiny shadow to make it "sit" on top
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: { elevation: 2 },
    }),
  },
  emojiBadgeText: {
    fontSize: 10,
  },
});
