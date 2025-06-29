import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Easing,
  Share,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

const DEBUG = (process.env.DEBUG ?? "").toLowerCase() === "true";

// fallback dummy when no urls passed
const FALLBACK = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: n,
  uri: require("../../assets/image-3.png"),
}));

export default function ComicResultScreen() {
  const router = useRouter();
  const { urls } = useLocalSearchParams<{ urls: string }>();

  // Safe JSON parsing with error handling
  let comicUrls: string[] = [];
  try {
    if (urls) {
      comicUrls = JSON.parse(urls);
    }
  } catch (error) {
    console.error("Failed to parse URLs:", error);
    // If parsing fails, try to handle it as a single URL or empty array
    if (typeof urls === "string" && urls.startsWith("http")) {
      comicUrls = [urls];
    } else {
      comicUrls = [];
    }
  }

  const PANELS = comicUrls.length
    ? comicUrls.map((u: string, i: number) => ({ id: i + 1, uri: { uri: u } }))
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
  const discard = () => router.push("/(tab)/DashboardScreen");

  const handleBack = () => {
    // If we have comic URLs, we likely came from viewing an existing comic
    // If we don't have URLs, we likely came from creating a new comic
    if (comicUrls.length > 0) {
      router.back(); // Go back to previous screen (likely Timeline)
    } else {
      router.push("/(tab)/DashboardScreen"); // Go to Dashboard for new comics
    }
  };

  const handleShare = async () => {
    try {
      if (comicUrls.length === 0) {
        Alert.alert("No comic to share");
        return;
      }

      const result = await Share.share({
        message: "Check out my dream comic!",
        url: comicUrls[0], // Share the first panel
      });

      if (result.action === Share.sharedAction) {
        if (DEBUG) console.log("Shared successfully");
      }
    } catch (error) {
      Alert.alert("Error sharing comic", "Failed to share the comic");
    }
  };

  const handleDownload = async () => {
    try {
      if (comicUrls.length === 0) {
        Alert.alert("No comic to download");
        return;
      }

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to save images");
        return;
      }

      // Download the first panel as an example
      const url = comicUrls[0];
      const filename = `dream_comic_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert("Success", "Comic panel saved to your photos!");
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      Alert.alert("Error downloading", "Failed to save the comic panel");
    }
  };

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.85)", "#000"]}
      style={styles.container}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Your Comic</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* title */}
      <Text style={styles.title}>YOUR DREAM IS NOW A COMIC!</Text>

      {/* comic 6‑grid */}
      <Animated.View
        style={[styles.boardWrapper, { transform: [{ translateY }] }]}
      >
        {PANELS.map((p: any, idx: number) => (
          <View key={p.id} style={styles.panel}>
            <Image source={p.uri} style={styles.panelImg} resizeMode="cover" />
            <View style={styles.numberBadge}>
              <Text style={styles.badgeText}>{p.id}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* actions row */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.circleBtn} onPress={() => setLiked(!liked)}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? "#FF4EE0" : "#FF4EE0"}
          />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={handleShare}>
          <Ionicons name="share" size={22} color="#00EAFF" />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={handleDownload}>
          <Ionicons name="download" size={22} color="#00EAFF" />
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={discard}>
          <Ionicons name="close" size={22} color="#FF4EE0" />
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
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#00EAFF",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 40,
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
