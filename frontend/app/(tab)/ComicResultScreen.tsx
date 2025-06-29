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
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

const DEBUG = (process.env.DEBUG ?? "").toLowerCase() === "true";

/*───────────────────────────────────*/
/*  FALLBACK IMAGES                  */
/*───────────────────────────────────*/
const FALLBACK = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  uri: require("../../assets/image-3.png"),
}));

export default function ComicResultScreen() {
  const router = useRouter();
  const { urls } = useLocalSearchParams<{ urls: string }>();

  /*──────── Parse Query Param ────────*/
  let comicUrls: string[] = [];
  try {
    if (urls) comicUrls = JSON.parse(urls);
  } catch {
    if (typeof urls === "string" && urls.startsWith("http")) comicUrls = [urls];
  }
  const PANELS = comicUrls.length
    ? comicUrls.map((u, i) => ({ id: i + 1, uri: { uri: u } }))
    : FALLBACK;

  /*──────── Dynamic tile width ────────*/
  const calcPanelSize = (count: number) => {
    if (count <= 2) return "48%"; // single row, nice & big
    if (count <= 4) return "45%"; // 2‑col grid, leave breathing room
    return "40%"; // 3‑col grid for 5‑6
  };
  const panelSize = calcPanelSize(PANELS.length);

  const [liked, setLiked] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);

  /*──────── Floating animation ────────*/
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

  /*──────── Navigation helpers ────────*/
  const discard = () => router.push("/(tab)/DashboardScreen");
  const handleBack = () => (comicUrls.length ? router.back() : discard());

  /*──────── Share / Download ────────*/
  const handleShare = async () => {
    if (!comicUrls.length) return Alert.alert("No comic to share");
    try {
      await Share.share({
        message: "Check out my dream comic!",
        url: comicUrls[0],
      });
    } catch {
      Alert.alert("Error", "Failed to share the comic");
    }
  };

  const handleDownload = async () => {
    if (!comicUrls.length) return Alert.alert("No comic to download");
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Permission", "Please allow access to save images");
    const fileUri = `${FileSystem.documentDirectory}dream_${Date.now()}.jpg`;
    const dl = await FileSystem.downloadAsync(comicUrls[0], fileUri);
    if (dl.status === 200) {
      await MediaLibrary.saveToLibraryAsync(dl.uri);
      Alert.alert("Saved", "Comic panel saved to Photos");
    }
  };

  /*──────── Render ────────*/
  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.85)", "#000"]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Your Comic</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.title}>YOUR DREAM IS NOW A COMIC!</Text>

      {/* Comic grid */}
      <View style={styles.comicContainer}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          <View style={styles.boardWrapper}>
            {PANELS.map((p, idx) => (
              <Pressable
                key={p.id}
                style={[styles.panel, { width: panelSize }]}
                onPress={() => {
                  setSelectedPanelIndex(idx);
                  setIsModalVisible(true);
                }}
              >
                <Image source={p.uri} style={styles.panelImg} />
                <View style={styles.numberBadge}>
                  <Text style={styles.badgeText}>{p.id}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {[
          {
            icon: liked ? "heart" : "heart-outline",
            onPress: () => setLiked(!liked),
            color: "#FF4EE0",
          },
          { icon: "share", onPress: handleShare, color: "#00EAFF" },
          { icon: "download", onPress: handleDownload, color: "#00EAFF" },
          { icon: "close", onPress: discard, color: "#FF4EE0" },
        ].map((b, i) => (
          <Pressable key={i} style={styles.circleBtn} onPress={b.onPress}>
            <Ionicons name={b.icon} size={22} color={b.color} />
          </Pressable>
        ))}
      </View>

      {/* Modal viewer */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <LinearGradient
          colors={["#0D0A3C", "rgba(13,10,60,0.95)", "#000"]}
          style={styles.modalContainer}
        >
          <Pressable
            style={styles.modalCloseBtn}
            onPress={() => setIsModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setSelectedPanelIndex(
                Math.round(
                  e.nativeEvent.contentOffset.x / Dimensions.get("window").width
                )
              )
            }
            contentOffset={{
              x: selectedPanelIndex * Dimensions.get("window").width,
              y: 0,
            }}
          >
            {PANELS.map((p, i) => (
              <View key={i} style={styles.swipePanel}>
                <Image source={p.uri} style={styles.swipeImage} />
              </View>
            ))}
          </ScrollView>
        </LinearGradient>
      </Modal>
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
  headerSpacer: { width: 40 },
  title: {
    textAlign: "center",
    color: "#00EAFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 32,
  },
  /* Grid container */
  comicContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 120,
  },
  boardWrapper: {
    width: "100%",
    maxWidth: 380,
    padding: 16,
    paddingBottom: 20, // bottom gap so border doesn’t hug images
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    columnGap: 14,
    justifyContent: "center", // ✱ center tiles horizontally
    borderWidth: 2,
    borderColor: "rgba(0,234,255,0.3)",
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.15)",
    shadowColor: "#00EAFF",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  panel: {
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  panelImg: { flex: 1, width: "100%", height: "100%" },
  numberBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#666" },
  /* Action row */
  actionsRow: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(0,234,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  /* Modal */
  modalContainer: { flex: 1 },
  modalCloseBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  swipePanel: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeImage: { width: "100%", height: "100%", resizeMode: "contain" },
});
