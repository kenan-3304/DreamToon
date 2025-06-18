import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";


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
