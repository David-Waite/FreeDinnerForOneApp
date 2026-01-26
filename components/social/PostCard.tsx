import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutPost } from "../../constants/types";

type Props = {
  post: WorkoutPost;
  onCommentPress: (post: WorkoutPost) => void;
};

export default function PostCard({ post, onCommentPress }: Props) {
  return (
    <View style={styles.card}>
      {/* Header */}
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

      {/* Image (Optional) */}
      {post.imageUri && (
        <Image source={{ uri: post.imageUri }} style={styles.postImage} />
      )}

      {/* Actions Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={26} color="#333" />
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

      {/* Caption & Comments Preview */}
      <View style={styles.content}>
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
  },
  actionButton: {},
  content: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  caption: { fontSize: 14, lineHeight: 18, color: "#333" },
  boldName: { fontWeight: "700" },
  viewComments: { color: "#888", marginTop: 6, fontSize: 14 },
});
