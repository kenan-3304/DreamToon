import React from "react";
import { Pressable, Text, StyleSheet, Animated, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}

/**
 * ShinyGradientButton — Modern CTA with subtle press feedback and elegant gradients.
 */
export const ShinyGradientButton: React.FC<ButtonProps> = ({
  onPress,
  children,
  disabled = false,
  size = "large",
}) => {
  const getTextSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "medium":
        return 15;
      case "large":
        return 16;
      default:
        return 16;
    }
  };

  const getButtonHeight = () => {
    switch (size) {
      case "small":
        return 36;
      case "medium":
        return 44;
      case "large":
        return 52;
      default:
        return 52;
    }
  };

  // Wrap string children in Text component
  const wrappedChildren =
    typeof children === "string" ? (
      <Text style={[styles.buttonText, { fontSize: getTextSize() }]}>
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <View style={styles.buttonContainer}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.buttonWrapper,
          { height: getButtonHeight() },
          pressed && !disabled && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
        android_ripple={{ color: "rgba(255,255,255,0.1)" }}
      >
        <View style={styles.buttonInner}>{wrappedChildren}</View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#492D81",
  },
  buttonWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#492D81",
  },
  buttonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 12,
    backgroundColor: "#492D81",
  },
  buttonText: {
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
