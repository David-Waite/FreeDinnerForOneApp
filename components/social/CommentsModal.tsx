import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostComment, WorkoutPost } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import Colors from "../../constants/Colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  post: WorkoutPost | null;
};

export default function CommentsModal({ visible, onClose, post }: Props) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NEW: Track which comment is being replied to
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (post) {
      setComments(post.comments || []);
    }
  }, [post, visible]);

  const handleSend = async () => {
    if (!inputText.trim() || !post) return;
    setIsSubmitting(true);

    // If replyingTo is set, pass its ID (or the ID of the comment triggering the reply)
    // The Repository handles finding the correct root parent.
    const parentId = replyingTo ? replyingTo.id : undefined;

    const newComment = await WorkoutRepository.addCommentToPost(
      post.id,
      inputText.trim(),
      parentId,
    );

    if (newComment) {
      // Locally update state to reflect change immediately
      if (parentId) {
        // Add to nested replies in local state
        setComments((prev) =>
          prev.map((c) => {
            // If we replied to a root comment
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), newComment] };
            }
            // If we replied to a child comment (need to find the root)
            if (c.replies?.some((r) => r.id === parentId)) {
              return { ...c, replies: [...(c.replies || []), newComment] };
            }
            return c;
          }),
        );
      } else {
        // Add to root
        setComments((prev) => [...prev, newComment]);
      }

      setInputText("");
      setReplyingTo(null); // Reset reply state
      Keyboard.dismiss();
    }
    setIsSubmitting(false);
  };

  const handleReplyPress = (comment: PostComment) => {
    setReplyingTo(comment);
    // Auto-fill username if replying to a specific person
    setInputText(`@${comment.userName} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setInputText("");
    Keyboard.dismiss();
  };

  const renderComment = ({ item }: { item: PostComment }) => (
    <View style={styles.commentRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.userName[0]}</Text>
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>

        {/* Reply Button for Root Comment */}
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => handleReplyPress(item)}
        >
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>

        {/* Nested Replies */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply) => (
              <View key={reply.id} style={styles.replyRow}>
                <View style={styles.avatarSmallDisplay}>
                  <Text style={styles.avatarTextSmall}>
                    {reply.userName[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.userName}>{reply.userName}</Text>
                    <Text style={styles.timeText}>
                      {new Date(reply.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{reply.text}</Text>
                  {/* Reply to a Reply */}
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => handleReplyPress(reply)}
                  >
                    <Text style={styles.replyButtonText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No comments yet. Be the first!
              </Text>
            }
          />

          {/* Reply Context Bar */}
          {replyingTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText}>
                Replying to{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {replyingTo.userName}
                </Text>
              </Text>
              <TouchableOpacity onPress={cancelReply}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.inputContainerWrapper,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.inputContainer}>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarTextSmall}>M</Text>
              </View>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={post ? `Add a comment...` : "Comment..."}
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              {inputText.trim().length > 0 && (
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={isSubmitting}
                  style={styles.postButton}
                >
                  <Text style={styles.postButtonText}>Post</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  listContent: { padding: 16, paddingBottom: 20 },
  emptyText: { textAlign: "center", color: "#999", marginTop: 20 },
  commentRow: { flexDirection: "row", marginBottom: 16 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  commentContent: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  userName: { fontWeight: "bold", fontSize: 14 },
  timeText: { color: "#999", fontSize: 12 },
  commentText: { fontSize: 14, color: "#333", lineHeight: 20 },

  // Reply Styles
  replyButton: { marginTop: 4, alignSelf: "flex-start" },
  replyButtonText: { fontSize: 12, fontWeight: "600", color: "#666" },
  repliesContainer: { marginTop: 12, paddingLeft: 8 },
  replyRow: { flexDirection: "row", marginBottom: 12, gap: 10 },
  avatarSmallDisplay: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Replying Bar
  replyingBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  replyingText: { fontSize: 13, color: "#666" },

  // Input Styles
  inputContainerWrapper: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextSmall: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  postButton: { paddingHorizontal: 8 },
  postButtonText: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
});
