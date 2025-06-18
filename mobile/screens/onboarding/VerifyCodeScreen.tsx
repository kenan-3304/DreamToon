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

// Re‑use the shiny button we already built
import { ShinyGradientButton } from "../../components/ShinyGradientButton";

// Type‑safe route params
type VerifyCodeRouteProp = RouteProp<RootStackParamList, "VerifyCode">;

const BOXES = 6;

const VerifyCodeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VerifyCodeRouteProp>();
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

  const resend = () => {
    // TODO: trigger resend API
    setCode(Array(BOXES).fill(""));
    inputs.current[0]?.focus();
  };

  const continueNext = () => {
    const full = code.join("");
    if (full.length === BOXES) {
      // TODO: call verification API then navigate
      navigation.navigate("CreateToon" as never);
    }
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

      {/* progress */}
      <View style={styles.progressWrapper}>
        <LinearGradient
          colors={["#00EAFF", "#FF4EE0"]}
          style={styles.progressActive}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <LinearGradient
          colors={["#00EAFF", "#FF4EE0"]}
          style={styles.progressActive}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={styles.progressInactive} />
      </View>
      <Text style={styles.progressLabel}>Step 2 of 3</Text>

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
          <ShinyGradientButton onPress={continueNext} disabled={!isComplete}>
            Continue
          </ShinyGradientButton>
        </View>
      </View>
    </Animated.View>
  );
};

export default VerifyCodeScreen;

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────
const BOX_SIZE = 56;

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
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressLabel: {
    textAlign: "center",
    color: "#8B8B8B",
    fontSize: 14,
    marginTop: 8,
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
});
