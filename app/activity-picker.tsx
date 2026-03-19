import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";

const DISMISS_THRESHOLD = 80;
const DISMISS_VELOCITY = 0.5;

export default function ActivityPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        overshootClamping: true,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => router.back());
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) sheetAnim.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > DISMISS_VELOCITY) {
          Animated.parallel([
            Animated.timing(backdropAnim, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => router.back());
        } else {
          Animated.spring(sheetAnim, {
            toValue: 0,
            damping: 20,
            stiffness: 200,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const navigate = useCallback((mode: "hypertrophy" | "cardio") => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace({
        pathname: "/new-session",
        params: { mode },
      });
    });
  }, []);

  return (
    <View style={styles.overlay}>
      {/* Fading dark backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      {/* Tap anywhere above the sheet to dismiss */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />

      {/* Sheet slides on/off — no fade */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetAnim }] },
        ]}
      >
        {/* Draggable handle */}
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <Text style={styles.title}>WHAT ARE WE DOING?</Text>
        <Text style={styles.subtitle}>Choose your session type</Text>

        {/* Hypertrophy */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigate("hypertrophy")}
        >
          <View style={[styles.iconCircle, { backgroundColor: Colors.successBackground }]}>
            <MaterialCommunityIcons name="dumbbell" size={26} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>HYPERTROPHY</Text>
            <Text style={styles.cardSubtitle}>Weight training & strength</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Cardio */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigate("cardio")}
        >
          <View style={[styles.iconCircle, { backgroundColor: Colors.errorBackground }]}>
            <MaterialCommunityIcons name="run-fast" size={26} color={Colors.error} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>CARDIO</Text>
            <Text style={styles.cardSubtitle}>Run, walk & more</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Custom — greyed out / coming soon */}
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.surface }]}>
            <Ionicons name="construct-outline" size={24} color={Colors.border} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, styles.textDisabled]}>CUSTOM</Text>
            <Text style={[styles.cardSubtitle, styles.textDisabled]}>Build your own session</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>SOON</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 0,
    borderTopWidth: 3,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.border,
  },
  handleArea: {
    alignItems: "center",
    paddingVertical: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 2,
  },
  textDisabled: { color: Colors.textMuted },
  comingSoonBadge: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
