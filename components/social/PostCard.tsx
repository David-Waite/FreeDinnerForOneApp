import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image } from "expo-image"; // <--- Swapped to expo-image
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutPost } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import ReactionPicker from "./ReactionPicker";
import Colors from "../../constants/Colors";
import { auth } from "../../config/firebase";

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
  const [reactions, setReactions] = useState<Record<string, string>>(
    post.reactions || {},
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const heartButtonRef =
    useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const currentUserId = auth.currentUser?.uid;
  const reactionValues = Object.values(reactions);
  const reactionCounts = reactionValues.reduce(
    (acc, emoji) => {
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const myReactionEmoji = currentUserId ? reactions[currentUserId] : undefined;

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;
    const updatedReactions = await WorkoutRepository.toggleReaction(
      post.id,
      emoji,
    );
    if (updatedReactions) setReactions(updatedReactions);
  };

  const handleLongPress = () => {
    heartButtonRef.current?.measureInWindow((x, y, width, height) => {
      // Adjusted: subtract more from Y (upwards) to account for the thicker bar
      // subtract width/2 from X to center it
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
          <Text style={styles.date}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
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

      {/* POST IMAGE - HIGH PERFORMANCE CACHED */}
      {post.imageUri && (
        <View style={styles.imageWrapper}>
          <Image
            source={post.imageUri}
            style={styles.postImage}
            contentFit="cover"
            transition={300} // Smooth fade-in
            cachePolicy="disk" // Ensures user only downloads this 2MB photo ONCE
          />
        </View>
      )}

      {/* REACTION BADGES */}
      {Object.keys(reactionCounts).length > 0 && (
        <View style={styles.reactionRow}>
          {Object.keys(reactionCounts).map((emoji) => (
            <View key={emoji} style={styles.reactionBadge}>
              <Text style={styles.reactionText}>
                {emoji} {reactionCounts[emoji]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ACTION BAR */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          ref={heartButtonRef}
          style={[
            styles.actionButton,
            myReactionEmoji && styles.activeActionButton,
          ]}
          onPress={() => handleReaction("❤️")}
          onLongPress={handleLongPress}
          delayLongPress={250}
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
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onCommentPress(post)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={Colors.textMuted}
          />
          <Text style={styles.actionText}>REPLY</Text>
        </TouchableOpacity>
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
  reactionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 6,
  },
  reactionBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reactionText: { fontSize: 12, color: Colors.text, fontWeight: "700" },
});
