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
        return 16;
      case "medium":
        return 18;
      case "large":
        return 20;
      default:
        return 20;
    }
  };

  const getButtonHeight = () => {
    switch (size) {
      case "small":
        return 48;
      case "medium":
        return 56;
      case "large":
        return 64;
      default:
        return 64;
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
      {/* Clean blur background layer */}
      <BlurView intensity={30} tint="dark" style={styles.blurBackground} />

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
        <LinearGradient
          colors={
            disabled
              ? ["#4A4A4A", "#666666"]
              : ["#00EAFF", "#6633EE", "#FF4EE0"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonInner}
        >
          {/* Subtle inner glow */}
          <LinearGradient
            colors={["rgba(255,255,255,0.15)", "transparent"]}
            style={styles.innerGlow}
          />

          {wrappedChildren}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#00EAFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonWrapper: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#00EAFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  buttonText: {
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.2,
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  innerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  blurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
