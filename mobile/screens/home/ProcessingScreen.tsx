import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TOTAL_MS = 90_000; // 1.5‑minute fake processing time
const SEGMENTS = 8; // radial progress bars
const STAGES = [
  "Analyzing your dream…",
  "Creating story structure…",
  "Designing characters…",
  "Generating comic panels…",
  "Adding final touches…",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
export default function ProcessingScreen() {
  const navigation = useNavigation();

  // progress & stage text
  const [pct, setPct] = useState(0); // 0‑100
  const [stage, setStage] = useState(0);

  // spinning outer ring
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // fake progress timer
  useEffect(() => {
    const tick = 500;
    let elapsed = 0;
    const int = setInterval(() => {
      elapsed += tick;
      const nextPct = Math.min((elapsed / TOTAL_MS) * 100, 100);
      setPct(nextPct);
      setStage(
        Math.min(
          Math.floor((elapsed / TOTAL_MS) * STAGES.length),
          STAGES.length - 1
        )
      );
      if (elapsed >= TOTAL_MS) {
        clearInterval(int);
        navigation.navigate("ComicResult" as never);
      }
    }, tick);
    return () => clearInterval(int);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const filled = Math.floor((pct / 100) * SEGMENTS);

  /*──────────────────────────────────────────────────────────────────────────*/
  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000"]}
      style={styles.container}
    >
      {/* greeting header */}
      <Text style={styles.greeting}>Processing your dream…</Text>

      {/* radial loader */}
      <View style={styles.loaderWrapper}>
        {/* rotating ring */}
        <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]}>
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const angle = (360 / SEGMENTS) * i;
            const active = i < filled;
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    transform: [
                      { translateX: -4 }, // half segment width
                      { rotate: `${angle}deg` },
                      { translateY: -140 },
                    ],
                    backgroundColor: active
                      ? "#00EAFF"
                      : "rgba(255,255,255,0.15)",
                    opacity: active ? 0.9 : 0.3,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* inner cosmic glow */}
        <LinearGradient
          colors={["rgba(0,234,255,0.3)", "rgba(255,78,224,0.3)"]}
          style={styles.innerGlow}
        >
          <Text style={styles.percent}>{Math.round(pct)}%</Text>
        </LinearGradient>
      </View>

      {/* stage & helper text */}
      <View style={styles.bottomTextWrap}>
        <Text style={styles.stage}>{STAGES[stage]}</Text>
      </View>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 80,
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  /* loader base */
  loaderWrapper: {
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    position: "absolute",
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  innerGlow: {
    width: 230,
    height: 230,
    borderRadius: 115,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(0,234,255,0.5)",
  },
  percent: {
    color: "#FFFFFF",
    fontSize: 36,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  bottomTextWrap: { paddingHorizontal: 32 },
  stage: { color: "#a7a7a7", fontSize: 16, textAlign: "center" },
});
