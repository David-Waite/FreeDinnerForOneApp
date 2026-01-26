import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { ExerciseNote } from "../../constants/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  notes: ExerciseNote[];
  onSaveNote: (text: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteNote: (id: string) => void;
};

export default function NotesModal({
  visible,
  onClose,
  exerciseName,
  notes,
  onSaveNote,
  onTogglePin,
  onDeleteNote,
}: Props) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const handleSave = () => {
    if (text.trim()) {
      onSaveNote(text.trim());
      setText("");
    }
  };

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
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Notes</Text>
              <Text style={styles.subtitle}>{exerciseName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.noteItem}>
                <View style={styles.noteContent}>
                  <Text style={styles.noteText}>{item.text}</Text>
                  <Text style={styles.noteDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => onTogglePin(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons
                      name={item.isPinned ? "pin" : "pin-outline"}
                      size={20}
                      color={item.isPinned ? Colors.primary : "#999"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDeleteNote(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No notes yet for this exercise.
                </Text>
              </View>
            }
          />

          <View
            style={[
              styles.inputContainer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Add a note..."
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !text.trim() && styles.sendButtonDisabled,
              ]}
              disabled={!text.trim()}
              onPress={handleSave}
            >
              <Ionicons
                name="arrow-up"
                size={24}
                color={text.trim() ? "#fff" : "#999"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
  },
  title: { fontSize: 20, fontWeight: "bold" },
  subtitle: { fontSize: 14, color: "#666", marginTop: 2 },
  closeButton: { padding: 4 },
  listContent: { padding: 16 },
  noteItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteContent: { flex: 1 },
  noteText: { fontSize: 16, color: "#333", marginBottom: 4 },
  noteDate: { fontSize: 12, color: "#999" },
  actions: { flexDirection: "row", paddingLeft: 8, gap: 8 },
  actionBtn: { padding: 4 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#999", fontSize: 16 },
  inputContainer: {
    backgroundColor: "#fff",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5ea",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#f2f2f7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#e5e5ea" },
});
