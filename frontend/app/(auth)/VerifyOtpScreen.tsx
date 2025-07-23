import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // Assuming you use expo icons
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import useAuth from "../../hooks/useAuth";

const VerifyOtpScreen: React.FC = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, loading } = useAuth();

  const [code, setCode] = useState(new Array(6).fill(""));
  const inputs = useRef<Array<TextInput | null>>([]);

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
    try {
      if (!email) throw new Error("Email not found");
      await verifyOtp(email, otp);
      // On success, the user is verified and logged in.
      // The root layout should handle navigation to the main app.
      router.replace("/(tab)/EnhancedDashboardScreen");
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message);
    }
  };

  return (
    <LinearGradient colors={["#492D81", "#1A1A3A"]} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Pressable onPress={() => router.replace("/(auth)/AuthScreen")}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code we sent to{" "}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.codeInputContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
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
              /* Add resend logic here */
            }}
          >
            <Text style={styles.resendLink}>Resend code</Text>
          </Pressable>
        </View>

        <View style={{ width: "100%", marginTop: 40 }}>
          <ShinyGradientButton onPress={handleContinue} disabled={loading}>
            CONTINUE
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
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#A7A7A7",
    textAlign: "center",
    marginBottom: 40,
  },
  emailText: {
    color: "#FFFFFF",
  },
  codeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 24,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  resendContainer: {
    flexDirection: "row",
  },
  resendText: {
    color: "#A7A7A7",
    fontSize: 14,
  },
  resendLink: {
    color: "#FFFFFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

export default VerifyOtpScreen;
