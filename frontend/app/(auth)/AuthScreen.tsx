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
  Platform, // Import Platform API
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import SocialLoginButton from "../../components/SocialLoginButton";
import useAuth from "../../hooks/useAuth";
import { FontAwesome } from "@expo/vector-icons"; // Import an icon for Apple
import googleIcon from "../../assets/images/google.png";
import appleIcon from "../../assets/images/apple_icon.png";
import { supabase } from "../../utils/supabase";

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Destructure the new signInWithApple function from the hook
  const { signInWithApple, signUpWithEmailOtp, loading } = useAuth();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /**
   * A reusable function to handle navigation after a successful sign-in.
   * Checks the user's subscription status and redirects accordingly.
   */
  const handleSuccessfulSignIn = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not retrieve user after sign-in.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      // PGRST116 means no profile was found, which is expected for a new user.
      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      // If no profile exists, they're a new user - send to create toon screen
      if (!profile) {
        router.replace("/(tab)/CreateToonScreen");
      } else {
        router.replace("/(tab)/index");
      }
    } catch (error: any) {
      Alert.alert("Error", `Failed to process sign-in: ${error.message}`);
    }
  };

  /**
   * Handles the Apple Sign-In flow.
   */
  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      await handleSuccessfulSignIn();
    } catch (error: any) {
      // Do not show an alert if the user simply cancelled the flow.
      if (error.code !== "1001") {
        // '1001' is the code for user cancellation on Apple Sign In
        Alert.alert("Sign-In Error", error.message);
      }
    }
  };

  /**
   * Handles the Google Sign-In flow.
   */
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      await handleSuccessfulSignIn();
    } catch (error: any) {
      // Do not show an alert if the user simply cancelled the flow.
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert("Sign-In Error", error.message);
      }
    }
  };

  /**
   * Handles the Email OTP flow.
   */
  const handleContinueWithEmail = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    try {
      await signUpWithEmailOtp(email);
      router.push({
        pathname: "/(auth)/VerifyOtpScreen",
        params: { email: email },
      });
    } catch (error: any) {
      console.error("Email OTP Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.bodyWrapper}>
            <Text style={styles.heading}>Welcome</Text>
            <Text style={styles.tagline}>Get your dream comic in seconds</Text>

            {/* --- PRIMARY ACTION: APPLE SIGN-IN (iOS only) --- */}
            {Platform.OS === "ios" && (
              <View style={{ width: "100%", marginBottom: -4 }}>
                <SocialLoginButton
                  icon={
                    <Image
                      source={appleIcon}
                      style={{ width: 40, height: 40, marginRight: 12 }}
                      resizeMode="contain"
                    />
                  }
                  text="Continue with Apple"
                  onPress={handleAppleSignIn}
                  disabled={loading}
                />
              </View>
            )}

            {/* --- GOOGLE SIGN-IN --- */}
            <View style={{ width: "100%", marginBottom: 32 }}>
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

            <Text style={styles.separatorText}>━━━━━━━━━ or ━━━━━━━━━</Text>

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
      </TouchableWithoutFeedback>
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
    justifyContent: "flex-start",
    paddingTop: 100,
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
    marginBottom: 40,
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
    borderRadius: 10,
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
