import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Colors from "../../constants/Colors";
import DuoTouch from "./DuoTouch";

export type AppAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  onClose: () => void;
};

export default function AppAlert({
  visible,
  title,
  message,
  buttons = [{ text: "OK" }],
  onClose,
}: Props) {
  const handlePress = (btn: AppAlertButton) => {
    onClose();
    btn.onPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View
            style={[
              styles.buttonRow,
              buttons.length === 1 && styles.buttonRowSingle,
            ]}
          >
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";

              return (
                <DuoTouch
                  key={i}
                  style={[
                    styles.btn,
                    isDestructive && styles.btnDestructive,
                    isCancel && styles.btnCancel,
                    !isDestructive && !isCancel && styles.btnDefault,
                    buttons.length === 1 && styles.btnFull,
                  ]}
                  onPress={() => handlePress(btn)}
                  hapticStyle={isDestructive ? "medium" : "light"}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isDestructive && styles.btnTextDestructive,
                      isCancel && styles.btnTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </DuoTouch>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 8,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  buttonRowSingle: {
    flexDirection: "column",
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  btnFull: {
    flex: 0,
  },
  btnDefault: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: "#46a302",
  },
  btnDestructive: {
    backgroundColor: Colors.error,
    borderBottomWidth: 4,
    borderBottomColor: "#a62626",
  },
  btnCancel: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  btnTextDestructive: {
    color: Colors.white,
  },
  btnTextCancel: {
    color: Colors.textMuted,
  },
});
