import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

// ────────────────────────────────────────────────────────────────────────────────
// Re-usable shiny gradient button (dimmed & smoother)
// ────────────────────────────────────────────────────────────────────────────────
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
      <LinearGradient
        colors={["#00EAFF", "#FF4EE0"]}
        style={styles.buttonInner}
      >
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

// ────────────────────────────────────────────────────────────────────────────────
// Lightweight Card stand-in (until you build a proper one or install a UI kit)
// ────────────────────────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.cardContent}>{children}</View>
);

// ────────────────────────────────────────────────────────────────────────────────
// Main Welcome screen
// ────────────────────────────────────────────────────────────────────────────────
const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation();

  const welcomeData = {
    title: "Welcome to Dream Toon",
    tagline: "Turn your dreams into comics",
    image: require("../../assets/image-3.png"), // 🔔 Update path if needed
    loginText: "Already have an account?",
    loginLink: "Login",
  } as const;

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
      <View style={styles.innerContent}>
        {/* Heading */}
        <Text style={styles.heading}>{welcomeData.title}</Text>

        {/* Hero image */}
        <Card>
          <CardContent>
            <Image source={welcomeData.image} style={styles.heroImage} />
          </CardContent>
        </Card>

        {/* Tagline */}
        <Text style={styles.tagline}>{welcomeData.tagline}</Text>

        {/* CTA Button */}
        <ShinyGradientButton
          onPress={() => navigation.navigate("CreateAccount" as never)}
        >
          Get Started →
        </ShinyGradientButton>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>{welcomeData.loginText}</Text>
          <Pressable onPress={() => navigation.navigate("Login" as never)}>
            <Text style={styles.loginLink}>{welcomeData.loginLink}</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

export default WelcomeScreen;

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  innerContent: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 40,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
  },
  heroImage: {
    width: 310,
    height: 310,
    borderRadius: 10,
    resizeMode: "cover",
  },
  tagline: {
    marginTop: 16,
    marginBottom: 32,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
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
  loginRow: {
    flexDirection: "row",
    marginTop: 32,
  },
  loginPrompt: {
    fontSize: 16,
    color: "#a7a7a7",
    fontWeight: "600",
  },
  loginLink: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  cardContent: {},
});
