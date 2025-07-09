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
  Platform,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import Background from "../../components/ui/Background";
import { supabase } from "../../utils/supabase";

const DEBUG = (process.env.DEBUG ?? "").toLowerCase() === "true";

/*───────────────────────────────────*/
/*  FALLBACK IMAGES                  */
/*───────────────────────────────────*/
const FALLBACK = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  uri: require("../../assets/image-3.png"),
}));

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

export default function ComicResultScreen() {
  const router = useRouter();
  const {
    urls,
    title: initialTitle,
    id,
  } = useLocalSearchParams<{ urls: string; title?: string; id?: string }>();

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
    if (count <= 2) return "48%";
    if (count <= 4) return "45%";
    return isIPad ? "42%" : "47%";
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
  const discard = () => router.push("/(tab)/EnhancedDashboardScreen");
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
    <Background>
      <LinearGradient
        colors={["rgba(13,10,60,0.3)", "rgba(13,10,60,0.1)", "rgba(0,0,0,0.1)"]}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, isIPad && styles.headerTablet]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons
              name="arrow-back"
              size={getResponsiveValue(24, 36)}
              color="#fff"
            />
          </Pressable>
        </View>

        {/* Title */}
        <Text style={[styles.titleText, isIPad && styles.titleTextTablet]}>
          Your Comic
        </Text>

        {/* Comic grid */}
        <View
          style={[styles.comicContainer, isIPad && styles.comicContainerTablet]}
        >
          <Animated.View style={{ transform: [{ translateY }] }}>
            <View
              style={[styles.boardWrapper, isIPad && styles.boardWrapperTablet]}
            >
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
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Actions */}
        <View style={[styles.actionsRow, isIPad && styles.actionsRowTablet]}>
          {(
            [
              { icon: "share", onPress: handleShare, color: "#9B5DE5" },
              { icon: "download", onPress: handleDownload, color: "#7F9CF5" },
              { icon: "close", onPress: discard, color: "#FF4EE0" },
            ] as const
          ).map((b, i) => (
            <Pressable
              key={i}
              style={[
                styles.circleBtn,
                isIPad && styles.circleBtnTablet,
                b.icon === "close" && {
                  borderColor: "#FF4EE0",
                  backgroundColor: "rgba(255,78,224,0.10)",
                },
              ]}
              onPress={b.onPress}
            >
              <Ionicons
                name={b.icon}
                size={getResponsiveValue(22, 32)}
                color={b.color}
              />
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
            colors={[
              "rgba(13,10,60,0.3)",
              "rgba(13,10,60,0.1)",
              "rgba(0,0,0,0.1)",
            ]}
            style={styles.modalContainer}
          >
            <Pressable
              style={[
                styles.modalCloseBtn,
                isIPad && styles.modalCloseBtnTablet,
              ]}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons
                name="close"
                size={getResponsiveValue(28, 40)}
                color="#fff"
              />
            </Pressable>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setSelectedPanelIndex(
                  Math.round(
                    e.nativeEvent.contentOffset.x /
                      Dimensions.get("window").width
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
                  <Image
                    source={p.uri}
                    style={[
                      styles.swipeImage,
                      isIPad && styles.swipeImageTablet,
                    ]}
                  />
                </View>
              ))}
            </ScrollView>
          </LinearGradient>
        </Modal>
      </LinearGradient>
    </Background>
  );
}

/* ────────────────────────── STYLES ────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 50,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  headerTablet: {
    height: 80,
    paddingTop: 32,
    paddingLeft: 32,
    paddingRight: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 100 },
  title: {
    textAlign: "center",
    color: "#F3F3F3",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 32,
    letterSpacing: 1.2,
  },
  titleTablet: {
    fontSize: 44,
    marginBottom: 68,
  },
  /* Grid container */
  comicContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 120,
  },
  comicContainerTablet: {
    paddingHorizontal: 80,
    marginBottom: 180,
  },
  boardWrapper: {
    width: "100%",
    padding: 16,
    paddingBottom: 35, // Increased bottom gap so border doesn't hug images
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    columnGap: 14,
    justifyContent: "center", // ✱ center tiles horizontally
    alignItems: "center",
    minHeight: SCREEN_HEIGHT * 0.4,
    maxHeight: SCREEN_HEIGHT * 0.6,
    height: SCREEN_HEIGHT * 0.65,
    alignSelf: "center",
    backgroundColor: "rgba(43,34,58,0.92)",
    borderWidth: 2,
    borderColor: "#BFA2F7",
    borderRadius: 24,
    shadowColor: "#9B5DE5",
    shadowOpacity: 0.25,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    marginTop: -15, // Shift card up slightly
  },
  boardWrapperTablet: {
    width: "90%",
    maxWidth: 700,
    paddingVertical: 46,
    paddingHorizontal: 48,
    borderRadius: 36,
    rowGap: 24,
    columnGap: 24,
    minHeight: SCREEN_HEIGHT * 0.5,
    maxHeight: SCREEN_HEIGHT * 0.75,
    height: SCREEN_HEIGHT * 0.65,
    alignSelf: "center",
    backgroundColor: "rgba(43,34,58,0.97)",
    shadowColor: "#9B5DE5",
    shadowOpacity: 0.18,
    shadowRadius: 60,
  },
  panel: {
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#2A223A",
  },
  panelImg: { flex: 1, width: "100%", height: "100%" },
  /* Action row */
  actionsRow: {
    position: "absolute",
    bottom: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  actionsRowTablet: {
    bottom: 120,
    left: 80,
    right: 80,
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#BFA2F7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(155,93,229,0.10)",
  },
  circleBtnTablet: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginHorizontal: 24,
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
  modalCloseBtnTablet: {
    top: 80,
    left: 60,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  swipePanel: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    justifyContent: "center",
    alignItems: "center",
  },
  swipeImage: { width: "100%", height: "100%", resizeMode: "contain" },
  swipeImageTablet: { width: "90%", height: "90%" },
  titleText: {
    color: "#F3F3F3",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 40,
  },
  titleTextTablet: {
    fontSize: 28,
    marginBottom: 24,
  },
});
