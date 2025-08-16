import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  Easing,
  Alert,
  Image,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import SocialLoginButton from "../../components/SocialLoginButton";
import useAuth from "../../hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import googleIcon from "../../assets/images/google.png";
import appleIcon from "../../assets/images/apple_icon.png";
import { supabase } from "../../utils/supabase";
import * as Haptics from "expo-haptics";
import { useUser } from "@/context/UserContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const { mode = "signup" } = useLocalSearchParams<{ mode?: string }>();
  const [email, setEmail] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Destructure the new signInWithApple function from the hook
  const { signInWithApple, signUpWithEmailOtp, signInWithGoogle, loading } =
    useAuth();

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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
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
        .select("subscription_status, display_avatar_path, onboarding_complete")
        .eq("id", user.id)
        .single();

      // If no profile exists, they're a new user - send to create toon screen
      if (!profile || !profile.onboarding_complete) {
        router.replace("/(tab)/CreateToonScreen");
      } else {
        router.replace("/(tab)");
      }
    } catch (error: any) {
      Alert.alert("Error", `Failed to process sign-in: ${error.message}`);
    }
  };

  /**
   * Handles the Apple Sign-In flow.
   */
  const handleAppleSignIn = async () => {
    triggerHaptic("medium");
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
    triggerHaptic("medium");
    try {
      await signInWithGoogle();
      await handleSuccessfulSignIn();
    } catch (error: any) {
      // Do not show an alert if the user simply cancelled the flow.
      if (error.code !== "SIGN_IN_CANCELLED") {
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
    triggerHaptic("medium");
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

  const handleBack = () => {
    triggerHaptic("light");
    router.back();
  };

  const isSignUp = mode === "signup";

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableWithoutFeedback onPress={handleBack}>
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </View>
            </TouchableWithoutFeedback>
          </View>

          <View style={styles.bodyWrapper}>
            {/* Enhanced Header */}
            <View style={styles.headerSection}>
              <Ionicons
                name="moon"
                size={getResponsiveValue(48, 64)}
                color="#E0B0FF"
              />
              <Text style={styles.heading}>
                {isSignUp ? "Join DreamToon" : "Welcome Back"}
              </Text>
              <Text style={styles.tagline}>
                {isSignUp
                  ? "Start creating your dream comics today"
                  : "Continue your dream journey"}
              </Text>
            </View>

            {/* Email Section - Moved to top for better keyboard handling */}
            <View style={styles.emailSection}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#E0B0FF" />
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

              <View style={styles.emailButtonWrapper}>
                <ShinyGradientButton
                  onPress={handleContinueWithEmail}
                  disabled={loading || !email.trim()}
                  size="large"
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    `Continue with Email`
                  )}
                </ShinyGradientButton>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialSection}>
              {/* Apple Sign-In (iOS only) */}
              {Platform.OS === "ios" && (
                <View style={styles.socialButtonWrapper}>
                  <SocialLoginButton
                    icon={
                      <Image
                        source={appleIcon}
                        style={styles.appleIcon}
                        resizeMode="contain"
                      />
                    }
                    text="Continue with Apple"
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  />
                </View>
              )}

              {/* Google Sign-In */}
              <View style={styles.socialButtonWrapper}>
                <SocialLoginButton
                  icon={
                    <Image
                      source={googleIcon}
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                  }
                  text="Continue with Google"
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                />
              </View>
            </View>
          </View>

          {/* Footer - Moved outside bodyWrapper to stay at bottom */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp
                ? "By continuing, you agree to our Terms of Service and Privacy Policy"
                : "Secure sign-in with your preferred method"}
            </Text>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: getResponsiveValue(60, 80),
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bodyWrapper: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(24, 40),
    paddingTop: getResponsiveValue(20, 40),
    paddingBottom: getResponsiveValue(20, 30),
  },
  headerSection: {
    alignItems: "center",
    marginBottom: getResponsiveValue(40, 60),
  },
  heading: {
    fontSize: getResponsiveValue(32, 44),
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: getResponsiveValue(16, 20),
    color: "#E0B0FF",
    textAlign: "center",
    lineHeight: getResponsiveValue(24, 28),
    fontWeight: "500",
  },
  socialSection: {
    marginBottom: getResponsiveValue(32, 48),
  },
  socialButtonWrapper: {
    width: "100%",
    marginBottom: 16,
  },
  appleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveValue(32, 48),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    color: "#B0B0B0",
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 16,
  },
  emailSection: {
    marginBottom: getResponsiveValue(32, 48),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
  },
  textInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 12,
  },
  emailButtonWrapper: {
    width: "100%",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: getResponsiveValue(24, 40),
    paddingBottom: getResponsiveValue(40, 60),
  },
  footerText: {
    fontSize: 12,
    color: "#B0B0B0",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "400",
  },
});
