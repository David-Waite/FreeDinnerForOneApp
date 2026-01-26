import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// IMPORTS FIXED: Use PostComment
import { PostComment, WorkoutPost } from "../../constants/types";
import { WorkoutRepository } from "../../services/WorkoutRepository";
import Colors from "../../constants/Colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  post: WorkoutPost | null;
};

export default function CommentsModal({ visible, onClose, post }: Props) {
  // FIX: Explicitly use PostComment[] here
  const [comments, setComments] = useState<PostComment[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (post) {
      setComments(post.comments || []);
    }
  }, [post, visible]);

  const handleSend = async () => {
    if (!inputText.trim() || !post) return;
    setIsSubmitting(true);

    const newComment = await WorkoutRepository.addCommentToPost(
      post.id,
      inputText.trim(),
    );

    if (newComment) {
      setComments((prev) => [...prev, newComment]);
      setInputText("");
    }
    setIsSubmitting(false);
  };

  // FIX: Type the item as PostComment
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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

          <SafeAreaView style={styles.inputSafeArea}>
            <View style={styles.inputContainer}>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarTextSmall}>M</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={
                  post ? `Add a comment for ${post.userName}...` : "Comment..."
                }
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
          </SafeAreaView>
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
  commentContent: { flex: 1, justifyContent: "center" },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  userName: { fontWeight: "bold", fontSize: 14 },
  timeText: { color: "#999", fontSize: 12 },
  commentText: { fontSize: 14, color: "#333", lineHeight: 20 },
  inputSafeArea: {
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
