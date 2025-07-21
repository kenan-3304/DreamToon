import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";

const WelcomeScreen: React.FC = () => {
  const router = useRouter();

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
      <View style={styles.innerContent}>
        <Text style={styles.heading}>Turn your dreams into comics</Text>
        <Card>
          <CardContent>
            {/* The image source comes from your original file */}
            <Image
              source={require("../../assets/image-3.png")}
              style={styles.heroImage}
            />
          </CardContent>
        </Card>

        {/* This button will now navigate to the new unified AuthScreen */}
        <ShinyGradientButton onPress={() => router.push("/(auth)/AuthScreen")}>
          Get Started →
        </ShinyGradientButton>

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account?</Text>
          {/* This link will also navigate to the new unified AuthScreen */}
          <Pressable onPress={() => router.push("/(auth)/AuthScreen")}>
            <Text style={styles.loginLink}>Login</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

// --- Helper Components from your original file ---
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.cardContent}>{children}</View>
);

export default WelcomeScreen;
// --- Styles from your original file ---
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
    width: 410,
    height: 410,
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
