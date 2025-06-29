import React, { useEffect, useRef } from "react";
import { Pressable, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}

/**
 * ShinyGradientButton — CTA with a subtle, slow shimmer + press feedback.
 */
export const ShinyGradientButton: React.FC<ButtonProps> = ({
  onPress,
  children,
  disabled = false,
  size = "large",
}) => {
  // Animated value that sweeps from 0 ➔ 1 continuously
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 4000, // slower sweep
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // Translate the shimmer bar across ~150% of the button width so the reset is off-screen
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });

  // Wrap string children in Text component
  const wrappedChildren =
    typeof children === "string" ? (
      <Text style={styles.buttonText}>{children}</Text>
    ) : (
      children
    );

  const getButtonHeight = () => {
    switch (size) {
      case "small":
        return 50;
      case "medium":
        return 60;
      case "large":
        return 70;
      default:
        return 70;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonWrapper,
        pressed && !disabled && { transform: [{ scale: 0.97 }] },
        disabled && styles.buttonDisabled,
      ]}
      android_ripple={{ color: "#ffffff20" }}
    >
      <LinearGradient
        colors={disabled ? ["#666666", "#888888"] : ["#00EAFF", "#FF4EE0"]}
        style={[styles.buttonInner, { height: getButtonHeight() }]}
      >
        {wrappedChildren}

        {/* Shimmer overlay – dimmer white and wider bar */}
        {!disabled && (
          <Animated.View
            pointerEvents="none"
            style={[styles.shimmerBar, { transform: [{ translateX }] }]}
          >
            <LinearGradient
              // dimmed highlight
              colors={["transparent", "rgba(255,255,255,0.25)", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
  },
  buttonInner: {
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  shimmerBar: {
    ...StyleSheet.absoluteFillObject,
    width: "200%", // make the bar wider than the button for smoother reset
  },
  buttonDisabled: {
    backgroundColor: "#666666",
  },
});
