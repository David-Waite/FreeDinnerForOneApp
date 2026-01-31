import React, { forwardRef } from "react";
import { TouchableWithoutFeedback, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface DuoTouchProps {
  children: React.ReactNode;
  onPress?: (event?: any) => void;
  onLongPress?: (event?: any) => void;
  style?: any;
  hapticStyle?: "light" | "medium" | "heavy" | "success" | "error";
  disabled?: boolean;
  // This allows the component to accept all the random extra props
  // that the Tab Navigator passes down (accessibility, focus, etc.)
  [key: string]: any;
}

// We use 'any' for the ref type to allow React Navigation's complex internal refs
const DuoTouch = forwardRef<any, DuoTouchProps>((props, ref) => {
  const {
    children,
    onPress,
    onLongPress,
    style,
    hapticStyle = "light",
    disabled = false,
    ...rest
  } = props;

  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.95);
    translateY.value = withSpring(2);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    translateY.value = withSpring(0);
  };

  const triggerHaptic = () => {
    if (disabled) return;
    switch (hapticStyle) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  };

  return (
    <TouchableWithoutFeedback
      // We MUST spread rest so Navigation knows how to handle the touch events
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={(e) => {
        if (!disabled) {
          triggerHaptic();
          if (onPress) onPress(e);
        }
      }}
      onLongPress={(e) => {
        if (!disabled && onLongPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress(e);
        }
      }}
      disabled={disabled}
    >
      <Animated.View
        ref={ref}
        style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
});

export default DuoTouch;
