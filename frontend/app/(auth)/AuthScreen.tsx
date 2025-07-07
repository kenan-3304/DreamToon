import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import useEmailAuth from "../../hooks/useEmailAuth";

const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- THIS IS THE FIX ---
  // Call the hook at the top level of the component
  const { signUp, signIn, loading, error: authError } = useEmailAuth();
  // -----------------------

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    try {
      // Now, use the 'signUp' function from the hook's return value
      await signUp(email, password);
      router.push("/(tab)/CreateToonScreen");
    } catch (error) {
      console.error("Sign Up Error:", error);
      Alert.alert("Sign Up Failed", error.message);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    try {
      // Use the 'signIn' function from the hook's return value
      await signIn(email, password);
      router.push("/(tab)/EnhancedDashboardScreen");
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert("Login Failed", error.message);
    }
  };

  // The JSX part of your component remains the same.
  // You could optionally use the 'loading' and 'authError'
  // variables from the hook to disable buttons or show errors.
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bodyWrapper}>
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.tagline}>Get your dream comic in seconds</Text>
        <View style={styles.inputCard}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#8B8B8B"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.textInput}
          />
          <View style={styles.divider} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8B8B8B"
            secureTextEntry
            style={styles.textInput}
          />
        </View>
        <View style={{ width: "100%", marginTop: 40 }}>
          <ShinyGradientButton onPress={handleSignUp}>
            Create Account
          </ShinyGradientButton>
        </View>
        <View style={{ width: "100%", marginTop: 16 }}>
          <ShinyGradientButton onPress={handleLogin}>Login</ShinyGradientButton>
        </View>
      </View>
    </Animated.View>
  );
};

export default AuthScreen;

// Styles are unchanged
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
