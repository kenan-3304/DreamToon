import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  Easing,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import SocialLoginButton from "../../components/SocialLoginButton";
import useAuth from "../../hooks/useAuth";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import googleIcon from "../../assets/images/google.png";
import { supabase } from "../../utils/supabase"; // Make sure this import is present

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Use the simplified auth hook
  const { signInWithGoogle, signUpWithEmailOtp, loading } = useAuth();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // This function handles both sign-up and sign-in via email OTP
  const handleContinueWithEmail = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    try {
      await signUpWithEmailOtp(email);
      // Navigate to the verification screen, passing the email
      router.push({
        pathname: "/(auth)/VerifyOtpScreen", // Ensure this path is correct
        params: { email: email },
      });
    } catch (error: any) {
      console.error("Email OTP Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not retrieve user after sign-in.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (!profile || profile.subscription_status === "free") {
        router.replace("/(modals)/PaywallScreen");
      } else {
        router.replace("/(tab)/EnhancedDashboardScreen");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.bodyWrapper}>
          <Text style={styles.heading}>Welcome</Text>
          <Text style={styles.tagline}>Get your dream comic in seconds</Text>

          {/* --- PRIMARY ACTION: GOOGLE SIGN-IN --- */}
          <View style={{ width: "100%", marginBottom: 40 }}>
            <SocialLoginButton
              icon={
                <Image
                  source={googleIcon}
                  style={{ width: 22, height: 22, marginRight: 12 }}
                  resizeMode="contain"
                />
              }
              text="Continue with Google"
              onPress={handleGoogleSignIn}
              disabled={loading}
            />
          </View>

          <Text style={styles.separatorText}>Or</Text>

          {/* --- SECONDARY ACTION: EMAIL OTP --- */}
          <View style={styles.inputCard}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#8B8B8B"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>
          <View style={{ width: "100%", marginTop: 24 }}>
            <ShinyGradientButton
              onPress={handleContinueWithEmail}
              disabled={loading}
            >
              Continue with Email
            </ShinyGradientButton>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  bodyWrapper: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 40,
    justifyContent: "center",
  },
  heading: {
    fontSize: 44,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: "#8B8B8B",
    marginBottom: 60,
    textAlign: "center",
  },
  separatorText: {
    color: "#8B8B8B",
    fontSize: 16,
    marginBottom: 20,
  },
  inputCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingHorizontal: 20,
  },
  textInput: {
    width: "100%",
    height: 60,
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    width: "100%",
  },
});
