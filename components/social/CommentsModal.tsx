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
import { Image } from "expo-image";
import { auth } from "../../config/firebase";
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
  const currentUser = auth.currentUser;

  const [comments, setComments] = useState<PostComment[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    const parentId = replyingTo ? replyingTo.id : undefined;

    const newComment = await WorkoutRepository.addCommentToPost(
      post.id,
      inputText.trim(),
      parentId,
    );

    if (newComment) {
      if (parentId) {
        setComments((prev) =>
          prev.map((c) => {
            if (
              c.id === parentId ||
              c.replies?.some((r) => r.id === parentId)
            ) {
              return { ...c, replies: [...(c.replies || []), newComment] };
            }
            return c;
          }),
        );
      } else {
        setComments((prev) => [...prev, newComment]);
      }

      setInputText("");
      setReplyingTo(null);
      Keyboard.dismiss();
    }
    setIsSubmitting(false);
  };

  const handleReplyPress = (comment: PostComment) => {
    setReplyingTo(comment);
    setInputText(`@${comment.userName} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setInputText("");
    Keyboard.dismiss();
  };

  // Helper to render the Avatar Squircle
  const renderAvatar = (
    url?: string,
    name?: string,
    sizeStyle: any = styles.avatar,
  ) => (
    <View style={[sizeStyle, styles.avatarBase]}>
      {url ? (
        <Image
          source={url}
          style={styles.avatarImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text style={styles.avatarText}>
          {name ? name[0].toUpperCase() : "?"}
        </Text>
      )}
    </View>
  );

  const renderComment = ({ item }: { item: PostComment }) => (
    <View style={styles.commentRow}>
      {renderAvatar(item.userPhotoURL, item.userName)}

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

        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => handleReplyPress(item)}
        >
          <Text style={styles.replyButtonText}>Reply</Text>
        </TouchableOpacity>

        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply) => (
              <View key={reply.id} style={styles.replyRow}>
                {renderAvatar(
                  reply.userPhotoURL,
                  reply.userName,
                  styles.avatarSmallDisplay,
                )}
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
        style={{ flex: 1, backgroundColor: Colors.border }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
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

          {replyingTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText}>
                Replying to{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {replyingTo.userName}
                </Text>
              </Text>
              <TouchableOpacity onPress={cancelReply}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.textMuted}
                />
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
              {renderAvatar(
                currentUser?.photoURL || undefined,
                currentUser?.displayName || "Me",
                styles.avatarSmall,
              )}

              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={post ? `Add a comment...` : "Comment..."}
                placeholderTextColor={Colors.placeholder}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
    textAlign: "center",
    color: Colors.text,
    letterSpacing: 1,
  },
  listContent: { padding: 16, paddingBottom: 20 },
  emptyText: {
    textAlign: "center",
    color: Colors.placeholder,
    marginTop: 20,
    fontWeight: "700",
  },
  commentRow: { flexDirection: "row", marginBottom: 20 },

  avatarBase: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4, // This is the "shelf" that was being covered
    overflow: "hidden", // This clips the image so it doesn't spill
    justifyContent: "center",
    alignItems: "center",
  },

  // 2. SIZING MODULES
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
  },
  avatarSmallDisplay: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginRight: 10,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },

  // 3. THE IMAGE (THE FIX)
  avatarImage: {
    width: "100%",
    // We set the height to slightly less than 100%
    // to ensure it doesn't overlap the bottom border
    height: "100%",
    position: "absolute",
    top: 0,
    // Matching the container's roundness
    borderRadius: 5,
  },

  avatarText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 14,
    // Push the text up slightly so it looks centered
    // on the "top" part of the 3D tile
    marginTop: -2,
  },

  avatarTextSmall: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "900",
    marginTop: -2,
  },

  // Layout adjustments

  repliesContainer: {
    marginTop: 12,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
  },
  replyRow: {
    flexDirection: "row",
    marginBottom: 12,
    paddingLeft: 8,
  },

  // Input Area Styles
  inputContainerWrapper: {
    borderTopWidth: 3,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },

  commentContent: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  userName: { fontWeight: "800", fontSize: 14, color: Colors.text },
  timeText: { color: Colors.placeholder, fontSize: 12, fontWeight: "600" },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontWeight: "500",
  },

  replyButton: { marginTop: 4, alignSelf: "flex-start" },
  replyButtonText: { fontSize: 12, fontWeight: "800", color: Colors.textMuted },

  replyingBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  replyingText: { fontSize: 13, color: Colors.textMuted, fontWeight: "700" },

  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    color: Colors.text,
    fontWeight: "600",
  },
  postButton: { paddingHorizontal: 8 },
  postButtonText: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: 15,
  },
});
