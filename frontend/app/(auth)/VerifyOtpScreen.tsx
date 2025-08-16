import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../utils/supabase";
import paywallActive from "@/context/PaywallContext";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const VerifyOtpScreen: React.FC = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, loading } = useAuth();

  const [code, setCode] = useState(new Array(6).fill(""));
  const inputs = useRef<Array<TextInput | null>>([]);

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

  const handleInputChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Move to next input if a character is entered
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace if current input is empty
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleContinue = async () => {
    const otp = code.join("");
    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit code.");
      return;
    }
    triggerHaptic("medium");
    try {
      if (!email) throw new Error("Email not found");
      await verifyOtp(email, otp);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not retrieve user after verification.");

      // Step 3: Fetch the user's profile from the database.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      // Step 4: Navigate based on subscription status.
      if (!profile) {
        router.replace("/(tab)/CreateToonScreen");
      } else if (profile.subscription_status === "free" && paywallActive) {
        router.replace("/(modals)/PaywallScreen");
      } else {
        router.replace("/(tab)");
      }
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message);
    }
  };

  const handleBack = () => {
    triggerHaptic("light");
    router.back();
  };

  const handleClose = () => {
    triggerHaptic("light");
    router.replace("/(auth)/AuthScreen");
  };

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={handleClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Ionicons
            name="checkmark-circle"
            size={getResponsiveValue(48, 64)}
            color="#E0B0FF"
          />
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code we sent to{" "}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>

        <View style={styles.codeInputContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={styles.codeInput}
              keyboardType="number-pad"
              maxLength={1}
              onChangeText={(text) => handleInputChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              value={digit}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Code expired? </Text>
          <Pressable
            onPress={() => {
              triggerHaptic("light");
              /* Add resend logic here */
            }}
          >
            <Text style={styles.resendLink}>Resend code</Text>
          </Pressable>
        </View>

        <View style={styles.buttonContainer}>
          <ShinyGradientButton
            onPress={handleContinue}
            disabled={loading}
            size="large"
          >
            Verify & Continue
          </ShinyGradientButton>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: getResponsiveValue(60, 80),
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: getResponsiveValue(24, 40),
    paddingTop: getResponsiveValue(40, 60),
  },
  headerSection: {
    alignItems: "center",
    marginBottom: getResponsiveValue(40, 60),
  },
  title: {
    fontSize: getResponsiveValue(32, 44),
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: getResponsiveValue(16, 20),
    color: "#E0B0FF",
    textAlign: "center",
    lineHeight: getResponsiveValue(24, 28),
    fontWeight: "500",
  },
  emailText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  codeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: getResponsiveValue(32, 48),
  },
  codeInput: {
    width: getResponsiveValue(48, 64),
    height: getResponsiveValue(60, 80),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    color: "#FFFFFF",
    fontSize: getResponsiveValue(24, 32),
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    marginBottom: getResponsiveValue(40, 60),
  },
  resendText: {
    color: "#B0B0B0",
    fontSize: 14,
  },
  resendLink: {
    color: "#E0B0FF",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  buttonContainer: {
    width: "100%",
  },
});

export default VerifyOtpScreen;
