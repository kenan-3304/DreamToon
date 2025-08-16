import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const AnimatedView = Animated.createAnimatedComponent(View);

const WelcomeScreen: React.FC = () => {
  const router = useRouter();

  // Animation values
  const heroScale = useSharedValue(0.8);
  const heroOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.9);
  const titleOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(0);
  const floatingY = useSharedValue(0);

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

  useEffect(() => {
    // Staggered entrance animations
    setTimeout(() => {
      heroOpacity.value = withTiming(1, { duration: 800 });
      heroScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    }, 200);

    setTimeout(() => {
      titleOpacity.value = withTiming(1, { duration: 600 });
      titleScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    }, 400);

    setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: 600 });
      buttonScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    }, 600);

    // Continuous floating animation
    floatingY.value = withRepeat(
      withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const handleGetStarted = () => {
    triggerHaptic("medium");
    router.push({
      pathname: "/(auth)/AuthScreen",
      params: { mode: "signup" },
    });
  };

  const handleLogin = () => {
    triggerHaptic("light");
    router.push({
      pathname: "/(auth)/AuthScreen",
      params: { mode: "signin" },
    });
  };

  // Animated styles
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const floatingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingY.value }],
  }));

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      {/* Background decorative elements */}
      <View style={styles.backgroundElements}>
        <AnimatedView
          style={[styles.floatingOrb, styles.orb1, floatingAnimatedStyle]}
        />
        <AnimatedView
          style={[styles.floatingOrb, styles.orb2, floatingAnimatedStyle]}
        />
      </View>

      <View style={styles.innerContent}>
        {/* Header */}
        <AnimatedView style={[styles.header, titleAnimatedStyle]}>
          <Ionicons
            name="moon"
            size={getResponsiveValue(32, 48)}
            color="#E0B0FF"
          />
          <Text style={styles.appName}>DreamToon</Text>
        </AnimatedView>

        {/* Main content */}
        <AnimatedView style={[styles.heroSection, heroAnimatedStyle]}>
          <Text style={styles.heading}>Turn your dreams into comics</Text>
          <Text style={styles.subheading}>
            Transform your wildest dreams into beautiful comic strips starring
            your own avatar
          </Text>

          <View style={styles.heroCard}>
            <Image
              source={require("../../assets/image-3.png")}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="sparkles" size={24} color="#E0B0FF" />
              <Text style={styles.overlayText}>Your dreams, visualized</Text>
            </View>
          </View>
        </AnimatedView>

        {/* Action buttons */}
        <AnimatedView style={[styles.actionSection, buttonAnimatedStyle]}>
          <ShinyGradientButton onPress={handleGetStarted} size="large">
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Start Dreaming</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </ShinyGradientButton>

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account?</Text>
            <Pressable onPress={handleLogin} style={styles.loginButton}>
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
          </View>
        </AnimatedView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ✨ Where dreams become reality ✨
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundElements: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(224,176,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(224,176,255,0.3)",
  },
  orb1: {
    width: 80,
    height: 80,
    top: "15%",
    left: "10%",
  },
  orb2: {
    width: 60,
    height: 60,
    top: "25%",
    right: "15%",
  },
  orb3: {
    width: 40,
    height: 40,
    bottom: "30%",
    left: "20%",
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(24, 40),
    paddingTop: getResponsiveValue(60, 80),
    paddingBottom: getResponsiveValue(40, 60),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: getResponsiveValue(40, 60),
  },
  appName: {
    fontSize: getResponsiveValue(28, 36),
    fontWeight: "800",
    color: "#E0B0FF",
    marginLeft: 12,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: getResponsiveValue(32, 44),
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subheading: {
    fontSize: getResponsiveValue(16, 20),
    color: "#E0B0FF",
    textAlign: "center",
    marginBottom: getResponsiveValue(32, 48),
    lineHeight: getResponsiveValue(24, 28),
    fontWeight: "500",
  },
  heroCard: {
    width: getResponsiveValue(280, 400),
    height: getResponsiveValue(280, 400),
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#E0B0FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overlayText: {
    color: "#E0B0FF",
    fontSize: 14,
    fontWeight: "600",
  },
  actionSection: {
    alignItems: "center",
    marginTop: getResponsiveValue(32, 48),
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  loginPrompt: {
    fontSize: 16,
    color: "#B0B0B0",
    fontWeight: "500",
  },
  loginButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  loginLink: {
    fontSize: 16,
    color: "#E0B0FF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  footer: {
    alignItems: "center",
    marginTop: getResponsiveValue(24, 32),
  },
  footerText: {
    fontSize: 14,
    color: "#B0B0B0",
    fontWeight: "500",
    textAlign: "center",
  },
});

export default WelcomeScreen;
