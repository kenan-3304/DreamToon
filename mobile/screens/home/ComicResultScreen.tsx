import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Heart, Share2, Download, X } from "lucide-react-native";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";

interface RouteParams {
  urls: string[];
}

// fallback dummy when no urls passed
const FALLBACK = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: n,
  uri: require("../../assets/image-3.png"),
}));

export default function ComicResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as RouteParams | undefined) ?? { urls: [] };
  const PANELS = params.urls.length
    ? params.urls.map((u, i) => ({ id: i + 1, uri: { uri: u } }))
    : FALLBACK;
  const [liked, setLiked] = useState(false);

  /* floating comic board animation */
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  /* handlers */
  const saveToLib = () => navigation.navigate("Library" as never);
  const discard = () => navigation.navigate("Dashboard" as never);

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.85)", "#000"]}
      style={styles.container}
    >
      {/* title */}
      <Text style={styles.title}>YOUR DREAM IS NOW A COMIC!</Text>

      {/* comic 6‑grid */}
      <Animated.View
        style={[styles.boardWrapper, { transform: [{ translateY }] }]}
      >
        {PANELS.map((p, idx) => (
          <View key={p.id} style={styles.panel}>
            <Image source={p.uri} style={styles.panelImg} resizeMode="cover" />
            <View style={styles.numberBadge}>
              <Text style={styles.badgeText}>{p.id}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* save */}
      <ShinyGradientButton style={{ width: 280 }} onPress={saveToLib}>
        Save to Library
      </ShinyGradientButton>

      {/* actions row */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.circleBtn} onPress={() => setLiked(!liked)}>
          <Heart
            size={22}
            color={liked ? "#FFF" : "#FF4EE0"}
            fill={liked ? "#FF4EE0" : "none"}
          />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={() => {}}>
          <Share2 size={22} color="#00EAFF" />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={() => {}}>
          <Download size={22} color="#00EAFF" />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={discard}>
          <X size={22} color="#FF4EE0" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

/* ────────────────────────── STYLES ────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    textAlign: "center",
    color: "#00EAFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    marginBottom: 24,
  },
  boardWrapper: {
    width: 300,
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "rgba(0,234,255,0.3)",
    borderRadius: 24,
    marginBottom: 32,
    backgroundColor: "rgba(0,0,0,0.15)",
    shadowColor: "#00EAFF",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  panel: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#222",
  },
  panelImg: { flex: 1, width: "100%", height: "100%" },
  numberBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#666" },
  /* actions */
  actionsRow: { flexDirection: "row", gap: 24, marginTop: 24 },
  circleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(0,234,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
