import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

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
    hiddenInputRef.current?.focus();
  };

  const handleCustomEmojiInput = (text: string) => {
    if (text.length > 0) {
      const emoji = Array.from(text)[0];
      onSelect(emoji);
      onClose();
    }
  };

  if (!visible || !position) return null;

  // Position logic
  const barWidth = 280;
  const top = position.y - 80; // Adjusted for chunky height
  const left = Math.min(
    Math.max(position.x - barWidth / 2, 20),
    100, // Prevent going too far right
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
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(emoji);
                  onClose();
                }}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.plusBtn}
              onPress={handlePlusPress}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.hiddenInputContainer}>
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          onChangeText={handleCustomEmojiInput}
          value=""
          keyboardType="default"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  barContainer: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6, // Thick Duo base
    gap: 8,
  },
  emojiBtn: {
    width: 42,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4, // Mini 3D button effect
  },
  emojiText: { fontSize: 20 },
  divider: {
    width: 2,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  plusBtn: {
    width: 42,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  hiddenInputContainer: {
    position: "absolute",
    top: -100,
    opacity: 0,
  },
  hiddenInput: {
    width: 1,
    height: 1,
  },
});
