import React, { useCallback } from "react";
import { Pressable, Text, StyleSheet, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "primary" | "secondary" | "ghost";
}

/**
 * ShinyGradientButton — Modern CTA with elegant gradients and smooth animations.
 */
export const ShinyGradientButton: React.FC<ButtonProps> = ({
  onPress,
  children,
  disabled = false,
  size = "large",
  variant = "primary",
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Enhanced haptic feedback
  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "heavy" = "light") => {
      if (Platform.OS === "ios") {
        const hapticType =
          type === "light"
            ? Haptics.ImpactFeedbackStyle.Light
            : type === "medium"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy;
        Haptics.impactAsync(hapticType);
      }
    },
    []
  );

  const handlePressIn = () => {
    if (!disabled) {
      triggerHaptic("light");
      scale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(0.9, { duration: 100 });
      glowOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  };

  const handlePress = () => {
    if (!disabled) {
      triggerHaptic("medium");
      onPress();
    }
  };

  const getTextSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "medium":
        return 16;
      case "large":
        return 18;
      default:
        return 18;
    }
  };

  const getButtonHeight = () => {
    switch (size) {
      case "small":
        return 40;
      case "medium":
        return 48;
      case "large":
        return 56;
      default:
        return 56;
    }
  };

  const getGradientColors = (): readonly [string, string, string] => {
    switch (variant) {
      case "primary":
        return ["#E0B0FF", "#C084FC", "#A855F7"] as const;
      case "secondary":
        return [
          "rgba(224,176,255,0.8)",
          "rgba(192,132,252,0.8)",
          "rgba(168,85,247,0.8)",
        ] as const;
      case "ghost":
        return [
          "rgba(255,255,255,0.1)",
          "rgba(255,255,255,0.05)",
          "rgba(255,255,255,0.1)",
        ] as const;
      default:
        return ["#E0B0FF", "#C084FC", "#A855F7"] as const;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case "primary":
        return "rgba(224,176,255,0.4)";
      case "secondary":
        return "rgba(224,176,255,0.3)";
      case "ghost":
        return "rgba(255,255,255,0.2)";
      default:
        return "rgba(224,176,255,0.4)";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "#FFFFFF";
      case "secondary":
        return "#FFFFFF";
      case "ghost":
        return "#E0B0FF";
      default:
        return "#FFFFFF";
    }
  };

  // Animated styles
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Wrap string children in Text component
  const wrappedChildren =
    typeof children === "string" ? (
      <Text
        style={[
          styles.buttonText,
          {
            fontSize: getTextSize(),
            color: getTextColor(),
          },
        ]}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <View style={styles.buttonContainer}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            height: getButtonHeight(),
            borderColor: getBorderColor(),
          },
          animatedGlowStyle,
        ]}
      />

      {/* Main button */}
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.buttonWrapper,
          { height: getButtonHeight() },
          animatedButtonStyle,
          disabled && styles.buttonDisabled,
        ]}
        android_ripple={{
          color: "rgba(255,255,255,0.1)",
          borderless: false,
          radius: 100,
        }}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            { height: getButtonHeight() },
            disabled && styles.gradientDisabled,
          ]}
        >
          <View style={styles.buttonInner}>{wrappedChildren}</View>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#E0B0FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonWrapper: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    borderRadius: 16,
  },
  gradientDisabled: {
    opacity: 0.5,
  },
  buttonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
