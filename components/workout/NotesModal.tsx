import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { ExerciseNote } from "../../constants/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  notes: ExerciseNote[];
  onSaveNote: (text: string) => void;
  onTogglePin: (noteId: string) => void;
};

export default function NotesModal({
  visible,
  onClose,
  exerciseName,
  notes,
  onSaveNote,
  onTogglePin,
}: Props) {
  const [newNoteText, setNewNoteText] = useState("");

  const handleSave = () => {
    if (newNoteText.trim()) {
      onSaveNote(newNoteText);
      setNewNoteText("");
    }
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{exerciseName} Notes</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {notes.length === 0 && (
            <Text style={styles.emptyNotes}>No notes yet. Add one below.</Text>
          )}

          {notes.map((note) => (
            <View
              key={note.id}
              style={[styles.noteCard, note.isPinned && styles.pinnedNote]}
            >
              <View style={styles.noteTop}>
                <Text style={styles.noteDate}>
                  {new Date(note.createdAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity onPress={() => onTogglePin(note.id)}>
                  <Ionicons
                    name={note.isPinned ? "pin" : "pin-outline"}
                    size={18}
                    color={note.isPinned ? Colors.primary : "#999"}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.noteText}>{note.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.addNoteContainer}>
          <TextInput
            style={styles.addNoteInput}
            placeholder="Add a new note..."
            value={newNoteText}
            onChangeText={setNewNoteText}
            multiline
          />
          <TouchableOpacity onPress={handleSave} style={styles.sendNoteBtn}>
            <Ionicons name="send" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: "#f2f2f7" },
  modalHeader: {
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalClose: { color: Colors.primary, fontSize: 16, fontWeight: "600" },
  modalBody: { padding: 16, flex: 1 },
  emptyNotes: { textAlign: "center", color: "#999", marginTop: 20 },
  noteCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#ddd",
  },
  pinnedNote: { borderLeftColor: Colors.primary, backgroundColor: "#f0f9ff" },
  noteTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  noteDate: { fontSize: 12, color: "#888" },
  noteText: { fontSize: 16, color: "#333" },
  addNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: 30,
  },
  addNoteInput: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendNoteBtn: { padding: 4 },
});
