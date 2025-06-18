import React, { useEffect, useRef } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
}

/**
 * ShinyGradientButton — CTA with a subtle, slow shimmer + press feedback.
 */
export const ShinyGradientButton: React.FC<ButtonProps> = ({
  onPress,
  children,
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonWrapper,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
      android_ripple={{ color: "#ffffff20" }}
    >
      <LinearGradient colors={["#00EAFF", "#FF4EE0"]} style={styles.buttonInner}>
        <Text style={styles.buttonText}>{children}</Text>

        {/* Shimmer overlay – dimmer white and wider bar */}
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
});
