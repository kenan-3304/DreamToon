import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../App"; // adjust the relative path if App.tsx lives elsewhere
import { ChevronLeft } from "lucide-react-native";

// Re‑use the shiny button we already built
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { supabase } from "../../supabaseClient";
import { syncSupabaseSession } from "../../syncSupabaseSession";

// Type‑safe route params
type VerifyCodeLoginRouteProp = RouteProp<
  RootStackParamList,
  "VerifyCodeLogin"
>;

const BOXES = 6;

const VerifyCodeLoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VerifyCodeLoginRouteProp>();
  const phone = route.params?.phone ?? "+1 703‑123‑4567";

  const [code, setCode] = useState<string[]>(Array(BOXES).fill(""));
  const inputs = useRef<Array<TextInput | null>>([]);

  // subtle entrance fade
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const onChangeDigit = (idx: number, value: string) => {
    if (value.length > 1) return; // single char only
    const updated = [...code];
    updated[idx] = value;
    setCode(updated);
    if (value && idx < BOXES - 1) inputs.current[idx + 1]?.focus();
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === "Backspace" && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const resend = async () => {
    setCode(Array(BOXES).fill(""));
    inputs.current[0]?.focus();
    await supabase.auth.signInWithOtp({ phone });
  };

  const continueNext = async () => {
    const full = code.join("");
    if (full.length === BOXES) {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: full,
        type: "sms",
      });
      if (!error) {
        await syncSupabaseSession();
        navigation.navigate("Dashboard" as never);
      } else {
        console.error(error);
      }
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const isComplete = code.every((d) => d);

  // helper to render each box
  const renderBox = (_: string, idx: number) => {
    const isActive = inputs.current[idx] && inputs.current[idx]?.isFocused?.();
    return (
      <TextInput
        key={idx}
        ref={(el) => (inputs.current[idx] = el)}
        value={code[idx]}
        onChangeText={(val) => onChangeDigit(idx, val)}
        onKeyPress={({ nativeEvent }) => onKeyPress(idx, nativeEvent.key)}
        maxLength={1}
        keyboardType="number-pad"
        style={[styles.codeBox, isActive && styles.codeBoxActive]}
        autoFocus={idx === 0}
      />
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <LinearGradient
        colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Back button */}
      <Pressable onPress={goBack} style={styles.backBtn}>
        <ChevronLeft size={20} color="#FFFFFF" />
      </Pressable>

      {/* body */}
      <View style={styles.content}>
        <Text style={styles.heading}>Verify Code</Text>
        <Text style={styles.subHeading}>
          Enter the 6‑digit code we sent to {phone}
        </Text>

        <View style={styles.boxRow}>{code.map(renderBox)}</View>

        <Pressable onPress={resend} style={{ marginTop: 24 }}>
          <Text style={styles.resendLink}>Resend Code</Text>
        </Pressable>

        <View style={{ width: "100%", marginTop: 50 }}>
          <ShinyGradientButton onPress={continueNext}>
            Continue
          </ShinyGradientButton>
        </View>
      </View>
    </Animated.View>
  );
};

export default VerifyCodeLoginScreen;

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────
const BOX_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 44,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  subHeading: {
    fontSize: 18,
    color: "#8B8B8B",
    textAlign: "center",
    marginBottom: 60,
  },
  boxRow: {
    flexDirection: "row",
    gap: 12,
  },
  codeBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  codeBoxActive: {
    borderColor: "#00EAFF",
  },
  resendLink: {
    color: "#00EAFF",
    fontSize: 18,
    fontWeight: "500",
  },
  backBtn: {
    position: "absolute",
    top: 100,
    left: 20,
    padding: 10,
  },
});
