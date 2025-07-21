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
        return 32;
      case "medium":
        return 38;
      case "large":
        return 44;
      default:
        return 44;
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
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#8D79F0",
    backgroundColor: "#492D81",
    boxShadow: "1px -12px 17.7px 0px rgba(91, 55, 223, 0.31) inset",
  },
  buttonWrapper: {
    width: "100%",
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#492D81",
    borderWidth: 1,
    borderColor: "#8D79F0",
    boxShadow: "1px -12px 17.7px 0px rgba(91, 55, 223, 0.31) inset",
  },
  buttonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 40,
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
