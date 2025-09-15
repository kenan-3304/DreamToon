// /components/InitialLoadingScreen.tsx
import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedText = Animated.createAnimatedComponent(Text);

export const InitialLoadingScreen = () => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite repeats
      true // reverse the animation
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <LinearGradient colors={["#12081C", "#0D0A3C"]} style={styles.container}>
      {/* You can put your app logo or a more creative element here */}
      <AnimatedText style={[styles.loadingText, animatedStyle]}>
        Dreaming...
      </AnimatedText>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E0B0FF",
    letterSpacing: 2,
  },
});
