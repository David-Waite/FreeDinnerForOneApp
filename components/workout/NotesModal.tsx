import React, { useState } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
        // Increase this value to account for the header + status bar
        keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 0}
      >
        <View style={styles.container}>
          {/* 3D DUO HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subtitle}>EXERCISE INTEL</Text>
              <Text style={styles.title}>{exerciseName.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive" // iOS only: follows the finger
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={[styles.noteItem, item.isPinned && styles.pinnedNote]}
              >
                <View style={styles.noteContent}>
                  <Text style={styles.noteText}>{item.text}</Text>
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={10}
                      color={Colors.placeholder}
                    />
                    <Text style={styles.noteDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => onTogglePin(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons
                      name={item.isPinned ? "pin" : "pin-outline"}
                      size={18}
                      color={item.isPinned ? Colors.gold : Colors.placeholder}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDeleteNote(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="notebook-edit"
                  size={60}
                  color={Colors.border}
                />
                <Text style={styles.emptyText}>NO NOTES YET</Text>
                <Text style={styles.emptySubText}>
                  Add tips or cues for your future self!
                </Text>
              </View>
            }
          />

          {/* CHUNKY INPUT AREA */}
          <View
            style={[
              styles.inputContainer,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Type a cue..."
                placeholderTextColor={Colors.placeholder}
                value={text}
                onChangeText={setText}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                !text.trim() && styles.sendButtonDisabled,
              ]}
              disabled={!text.trim()}
              onPress={handleSave}
            >
              <Ionicons name="arrow-up" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    // Ensure the container itself has a solid base
    minHeight: 80,
  },
  listContent: { padding: 16 },
  noteItem: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4, // Duo depth
  },
  pinnedNote: {
    borderColor: Colors.gold,
    borderBottomColor: "#cc9f00",
  },
  noteContent: { flex: 1 },
  noteText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  noteDate: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.placeholder,
    letterSpacing: 0.5,
  },
  actions: { flexDirection: "row", paddingLeft: 12, gap: 4 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: 1,
  },
  emptySubText: {
    color: Colors.placeholder,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },

  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: 16,
    fontWeight: "600",
    maxHeight: 100,
    color: Colors.text,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#46a302",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
    borderBottomWidth: 0,
    opacity: 0.5,
  },
});
