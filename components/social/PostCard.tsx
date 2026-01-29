import React, { useRef, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutPost, PostReaction } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import ReactionPicker from "./ReactionPicker";
import Colors from "../../constants/Colors";

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
  const [reactions, setReactions] = useState<PostReaction[]>(
    post.reactions || [],
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // const heartButtonRef =
  //   useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  // // Group reactions by emoji for display: { "❤️": 5, "🔥": 2 }
  // const reactionCounts = reactions.reduce(
  //   (acc, curr) => {
  //     acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
  //     return acc;
  //   },
  //   {} as Record<string, number>,
  // );

  // const currentUserReaction = reactions.find(
  //   (r) => r.userId === "current-user",
  // );

  // const handleReaction = async (emoji: string) => {
  //   const updated = await WorkoutRepository.toggleReaction(post.id, emoji);
  //   if (updated) {
  //     setReactions(updated);
  //   }
  // };

  // const handleHeartPress = () => {
  //   // If user already reacted, toggle 'heart'. If not, add 'heart'.
  //   handleReaction("❤️");
  // };

  // const handleLongPress = () => {
  //   heartButtonRef.current?.measureInWindow((x, y, width, height) => {
  //     setPickerPos({ x: x + width / 2, y: y });
  //     setPickerVisible(true);
  //   });
  // };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {/* AVATAR: Use Image if available, else Initials */}
        {post.authorAvatar ? (
          <Image
            source={{ uri: post.authorAvatar }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.authorName[0]}</Text>
          </View>
        )}

        <View>
          {/* UPDATED FIELD NAMES */}
          <Text style={styles.userName}>{post.authorName}</Text>
          <Text style={styles.date}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* --- ATTACHED WORKOUT BANNER --- */}
      {post.workoutSummary && (
        <View style={styles.workoutContainer}>
          <TouchableOpacity
            style={styles.workoutBanner}
            onPress={() => onWorkoutPress(post.workoutSummary!.id)}
            activeOpacity={0.7}
          >
            <View style={styles.workoutIcon}>
              <MaterialCommunityIcons name="dumbbell" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workoutTitle}>
                {post.workoutSummary.name}
              </Text>
              <Text style={styles.workoutSub}>
                {formatDuration(post.workoutSummary.duration)} •{" "}
                {post.workoutSummary.exerciseCount} Exercises
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* --- MAIN IMAGE --- */}
      {post.imageUri && (
        <Image source={{ uri: post.imageUri }} style={styles.postImage} />
      )}

      {/* --- ACTION BAR --- */}
      <View style={styles.actionBar}>
        {/* <TouchableOpacity
          ref={heartButtonRef}
          style={styles.actionButton}
          onPress={handleHeartPress}
          onLongPress={handleLongPress}
          delayLongPress={200}
        >
          <Ionicons
            name={currentUserReaction ? "heart" : "heart-outline"}
            size={26}
            color={currentUserReaction ? "#e91e63" : "#333"}
          />
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onCommentPress(post)}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="paper-plane-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* --- CONTENT & COMMENTS --- */}
      <View style={styles.content}>
        {/* Reaction Badges */}
        {/* {Object.keys(reactionCounts).length > 0 && (
          <View style={styles.reactionRow}>
            {Object.keys(reactionCounts).map((emoji) => (
              <View key={emoji} style={styles.reactionBadge}>
                <Text style={styles.reactionText}>
                  {emoji} {reactionCounts[emoji]}
                </Text>
              </View>
            ))}
          </View>
        )} */}

        {/* Caption */}
        <Text style={styles.caption}>
          <Text style={styles.boldName}>{post.authorName}</Text> {post.message}
        </Text>

        {/* View Comments Link */}
        {post.comments && post.comments.length > 0 && (
          <TouchableOpacity onPress={() => onCommentPress(post)}>
            <Text style={styles.viewComments}>
              View all {post.comments.length} comments
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- REACTION PICKER MODAL --- */}
      {/* <ReactionPicker
        visible={pickerVisible}
        position={pickerPos}
        onClose={() => setPickerVisible(false)}
        onSelect={handleReaction}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "bold" },
  userName: { fontWeight: "700", fontSize: 14 },
  date: { color: "#888", fontSize: 12 },
  postImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  actionBar: {
    flexDirection: "row",
    padding: 12,
    gap: 16,
    zIndex: 1,
  },
  actionButton: {},
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "#ccc",
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  reactionRow: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  reactionBadge: {
    backgroundColor: "#f0f2f5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  reactionText: { fontSize: 12, color: "#333" },
  caption: { fontSize: 14, lineHeight: 18, color: "#333" },
  boldName: { fontWeight: "700" },
  viewComments: { color: "#888", marginTop: 6, fontSize: 14 },

  // Workout Banner Styles
  workoutContainer: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  workoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  workoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  workoutTitle: { fontWeight: "bold", fontSize: 14, color: "#333" },
  workoutSub: { color: "#666", fontSize: 12 },
});
