import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  LayoutRectangle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutPost, PostReaction } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import ReactionPicker from "./ReactionPicker";

type Props = {
  post: WorkoutPost;
  onCommentPress: (post: WorkoutPost) => void;
};

export default function PostCard({ post, onCommentPress }: Props) {
  const [reactions, setReactions] = useState<PostReaction[]>(
    post.reactions || [],
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const heartButtonRef =
    useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  // Group reactions by emoji for display: { "❤️": 5, "🔥": 2 }
  const reactionCounts = reactions.reduce(
    (acc, curr) => {
      acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const currentUserReaction = reactions.find(
    (r) => r.userId === "current-user",
  );

  const handleReaction = async (emoji: string) => {
    const updated = await WorkoutRepository.toggleReaction(post.id, emoji);
    if (updated) {
      setReactions(updated);
    }
  };

  const handleHeartPress = () => {
    // If user already reacted, toggle 'heart'. If not, add 'heart'.
    handleReaction("❤️");
  };

  const handleLongPress = () => {
    heartButtonRef.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        setPickerPos({ x: x + width / 2, y: y });
        setPickerVisible(true);
      },
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.userName[0]}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{post.userName}</Text>
          <Text style={styles.date}>
            {new Date(post.date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {post.imageUri && (
        <Image source={{ uri: post.imageUri }} style={styles.postImage} />
      )}

      {/* --- REACTION BAR --- */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          ref={heartButtonRef} // IMPORTANT: Ref for measuring
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
        </TouchableOpacity>

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

      <View style={styles.content}>
        {/* --- REACTION COUNTS --- */}
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

        <Text style={styles.caption}>
          <Text style={styles.boldName}>{post.userName}</Text> {post.message}
        </Text>

        {post.comments && post.comments.length > 0 && (
          <TouchableOpacity onPress={() => onCommentPress(post)}>
            <Text style={styles.viewComments}>
              View all {post.comments.length} comments
            </Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: "#2c3e50",
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
    zIndex: 1, // Ensure buttons are clickable
  },
  actionButton: {},
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
});
