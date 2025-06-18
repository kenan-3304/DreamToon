import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

// ────────────────────────────────────────────────────────────────────────────────
// ShinyGradientButton — imported *re‑export* so it stays DRY.
// Move this component into a dedicated `components/Button.tsx` later for cleaner paths.
// import { ShinyGradientButton } from '../components/ShinyGradientButton';
import { ShinyGradientButton } from "./WelcomeScreen"; // ✅ temporary path
// ────────────────────────────────────────────────────────────────────────────────

const CreateAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const [phone, setPhone] = useState("");

  // Fade‑in for entire screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleNext = () => {
    if (!phone.trim()) return;
    navigation.navigate("VerifyCode" as never, { phone } as never);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Progress */}
      <View style={styles.progressWrapper}>
        <LinearGradient
          colors={["#00EAFF", "#FF4EE0"]}
          style={styles.progressActive}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={styles.progressInactive} />
        <View style={styles.progressInactive} />
      </View>
      <Text style={styles.progressLabel}>Step 1 of 3</Text>

      {/* Body */}
      <View style={styles.bodyWrapper}>
        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.tagline}>Get your dream comic in seconds</Text>

        {/* Phone input */}
        <View style={styles.phoneCard}>
          <View style={styles.phoneRow}>
            <Text style={styles.flag}>🇺🇸</Text>
            <Text style={styles.dialCode}>+1</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor="#8B8B8B"
              keyboardType="phone-pad"
              style={styles.phoneInput}
            />
          </View>
        </View>
        <Text style={styles.helperText}>We'll text you a login code</Text>

        {/* CTA */}
        <View style={{ width: "100%", marginTop: 40 }}>
          <ShinyGradientButton onPress={handleNext} disabled={!phone.trim()}>
            NEXT
          </ShinyGradientButton>
        </View>
      </View>
    </Animated.View>
  );
};

export default CreateAccountScreen;

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressWrapper: {
    flexDirection: "row",
    width: "80%",
    alignSelf: "center",
    marginTop: 40,
    gap: 8,
  },
  progressActive: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressInactive: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressLabel: {
    textAlign: "center",
    color: "#8B8B8B",
    fontSize: 14,
    marginTop: 8,
  },
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
  phoneCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 20,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flag: {
    fontSize: 26,
    marginRight: 8,
  },
  dialCode: {
    fontSize: 20,
    fontWeight: "500",
    color: "#FFFFFF",
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  helperText: {
    color: "#8B8B8B",
    fontSize: 16,
    marginTop: 24,
  },
});
