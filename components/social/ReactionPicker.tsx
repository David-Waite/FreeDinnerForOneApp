import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  position: { x: number; y: number } | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

const COMMON_REACTIONS = ["❤️", "🔥", "👏", "💪", "🎉"];

export default function ReactionPicker({
  visible,
  position,
  onSelect,
  onClose,
}: Props) {
  const hiddenInputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handlePlusPress = () => {
    // Focus the hidden input to bring up the keyboard
    hiddenInputRef.current?.focus();
  };

  const handleCustomEmojiInput = (text: string) => {
    // We only want the first character/emoji
    if (text.length > 0) {
      // Use Array.from to correctly handle surrogate pairs (emojis)
      const emoji = Array.from(text)[0];
      onSelect(emoji);
      onClose();
    }
  };

  if (!visible || !position) return null;

  // Calculate position to center the bar above the touch point
  // Bar width approx 300px, Height 50px
  const barWidth = 280;
  const top = position.y - 70; // 70px above the touch
  const left = Math.min(
    Math.max(position.x - barWidth / 2, 10), // Keep within left screen bound
    300, // Keep within right screen bound (approx)
  );

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.barContainer,
              { top, left, transform: [{ scale: scaleAnim }] },
            ]}
          >
            {COMMON_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => {
                  onSelect(emoji);
                  onClose();
                }}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity style={styles.plusBtn} onPress={handlePlusPress}>
              <Ionicons name="add" size={20} color="#555" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Hidden Input for Native Keyboard */}
      <View style={styles.hiddenInputContainer}>
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          onChangeText={handleCustomEmojiInput}
          value=""
          // Attempt to force emoji keyboard on supported devices
          keyboardType="default"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  barContainer: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    gap: 8,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#f5f5f7",
  },
  emojiText: { fontSize: 22 },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#eee",
    marginHorizontal: 4,
  },
  plusBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#eee",
  },
  hiddenInputContainer: {
    position: "absolute",
    top: -100,
    left: 0,
    opacity: 0,
  },
  hiddenInput: {
    width: 1,
    height: 1,
  },
});
