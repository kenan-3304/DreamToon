import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { ScreenLayout } from "@/components/ScreenLayout";

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
  const { profile, session, getComicById } = useUser();
  const { urls, id } = useLocalSearchParams<{ urls: string; id?: string }>();

  const [panelUrls, setPanelUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comicTitle, setComicTitle] = useState<string>("Your Dream Comic");
  const [creationDate, setCreationDate] = useState<string>("");

  // Enhanced haptic feedback
  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "heavy" = "light") => {
      if (Platform.OS === "ios") {
        const hapticType =
          type === "light"
            ? Haptics.ImpactFeedbackStyle.Light
            : type === "medium"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy;
        Haptics.impactAsync(hapticType);
      }
    },
    []
  );

  useEffect(() => {
    const fetchComicData = async () => {
      if (!id) {
        // Fallback for old navigation method or direct access
        console.error("Didnt send the dream id");
        try {
          if (urls) setPanelUrls(JSON.parse(urls));
        } catch {}
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const data = await getComicById(id);

      if (data) {
        setPanelUrls(data.panel_urls);
        if (data.title) setComicTitle(data.title);
        if (data.created_at) {
          const date = new Date(data.created_at);
          setCreationDate(date.toLocaleDateString());
        }
      } else {
        setError("Could not load the comic. please try again.");
      }
      // Fetch the full comic data using the ID
      // try {
      //   setError(null);
      //   const res = await fetch(
      //     `https://dreamtoon.onrender.com/comic-status/${id}`
      //   );
      //   const data = await res.json();
      //   if (data.status === "complete") {
      //     setPanelUrls(data.panel_urls);
      //     if (data.title) setComicTitle(data.title);
      //     if (data.created_at) {
      //       const date = new Date(data.created_at);
      //       setCreationDate(date.toLocaleDateString());
      //     }
      //   } else {
      //     setError("Could not load the comic. Please try again.");
      //   }
      // } catch (e) {
      //   setError(
      //     "Failed to connect to the server. Please check your connection."
      //   );
      // } finally {
      //   setIsLoading(false);
      // }
      setIsLoading(false);
    };

    fetchComicData();
  }, [id, getComicById]);

  const PANELS = panelUrls.length
    ? panelUrls.map((u, i) => ({ id: i + 1, uri: { uri: u } }))
    : FALLBACK;

  /*──────── Dynamic tile width ────────*/
  const calcPanelSize = (count: number) => {
    if (count <= 2) return "48%";
    if (count <= 4) return "47%";
    return isIPad ? "42%" : "47%";
  };
  const panelSize = calcPanelSize(PANELS.length);

  const [liked, setLiked] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);

  /*──────── Enhanced floating animation ────────*/
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  /*──────── Navigation helpers ────────*/
  const discard = () => {
    triggerHaptic("light");
    router.back();
  };

  const handleBack = () => {
    triggerHaptic("light");
    router.push("/(tab)/timeline");
  };

  /*──────── Enhanced Share / Download ────────*/
  const handleShare = async () => {
    if (!panelUrls.length) {
      Alert.alert("No comic to share");
      return;
    }

    triggerHaptic("medium");

    try {
      // Share all panels as a collection
      const shareMessage = `Check out my dream comic "${comicTitle}"! Created with DreamToon.`;
      await Share.share({
        message: shareMessage,
        url: panelUrls[0], // Primary image
      });
    } catch {
      Alert.alert("Error", "Failed to share the comic");
    }
  };

  const handleDownload = async () => {
    if (!panelUrls.length) {
      Alert.alert("No comic to download");
      return;
    }

    triggerHaptic("medium");

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission", "Please allow access to save images");
      return;
    }

    try {
      // Download all panels
      const downloadPromises = panelUrls.map(async (url, index) => {
        const fileUri = `${
          FileSystem.documentDirectory
        }dream_${Date.now()}_panel_${index + 1}.jpg`;
        const dl = await FileSystem.downloadAsync(url, fileUri);
        if (dl.status === 200) {
          await MediaLibrary.saveToLibraryAsync(dl.uri);
        }
        return dl.status === 200;
      });

      const results = await Promise.all(downloadPromises);
      const successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        Alert.alert(
          "Saved",
          `Successfully saved ${successCount} comic panel${
            successCount > 1 ? "s" : ""
          } to Photos`
        );
      } else {
        Alert.alert("Error", "Failed to save comic panels");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to download comic panels");
    }
  };

  const deleteComic = async () => {
    triggerHaptic("heavy");

    Alert.alert(
      "Delete Comic",
      "Are you sure you want to delete this comic? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const deleteResponse = await fetch(
                "https://dreamtoon.onrender.com/delete-comic/",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    dream_id: id,
                  }),
                }
              );

              if (!deleteResponse.ok) {
                const errorBody = await deleteResponse.json();
                console.error("--- BACKEND ERROR ---", errorBody);
                throw new Error(
                  `Delete comic failed: ${
                    errorBody.detail || "Unknown server error"
                  }`
                );
              }

              triggerHaptic("medium");
              router.replace("/(tab)/timeline");
            } catch (error) {
              Alert.alert("Error", "Failed to delete comic. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handlePanelPress = (index: number) => {
    triggerHaptic("light");
    setSelectedPanelIndex(index);
    setIsModalVisible(true);
  };

  /*──────── Render ────────*/
  const getBoardHeight = (count: number) => {
    if (count <= 2) return SCREEN_HEIGHT * 0.33;
    if (count <= 4) return SCREEN_HEIGHT * 0.41;
    return SCREEN_HEIGHT * 0.65;
  };

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E0B0FF" />
          <Text style={styles.loadingText}>Loading your dream comic...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        {/* Header with back button */}
        <View style={[styles.header, isIPad && styles.headerTablet]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons
              name="arrow-back"
              size={getResponsiveValue(24, 36)}
              color="#fff"
            />
          </Pressable>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorButtons}>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setIsLoading(true);
                setError(null);
                // Retry fetch
                const fetchComicData = async () => {
                  try {
                    const res = await fetch(
                      `https://dreamtoon.onrender.com/comic-status/${id}`
                    );
                    const data = await res.json();
                    if (data.status === "complete") {
                      setPanelUrls(data.panel_urls);
                      if (data.title) setComicTitle(data.title);
                      if (data.created_at) {
                        const date = new Date(data.created_at);
                        setCreationDate(date.toLocaleDateString());
                      }
                    } else {
                      setError("Could not load the comic. Please try again.");
                    }
                  } catch (e) {
                    setError(
                      "Failed to connect to the server. Please check your connection."
                    );
                  } finally {
                    setIsLoading(false);
                  }
                };
                fetchComicData();
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                triggerHaptic("light");
                router.back();
              }}
            >
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
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

      {/* Enhanced Title Section */}
      <View style={styles.titleSection}>
        <Text style={[styles.titleText, isIPad && styles.titleTextTablet]}>
          {comicTitle}
        </Text>
        {creationDate && (
          <Text style={styles.dateText}>Created on {creationDate}</Text>
        )}
      </View>

      {/* Comic grid */}
      <View
        style={[styles.comicContainer, isIPad && styles.comicContainerTablet]}
      >
        <Animated.View
          style={{
            transform: [{ translateY }, { scale: scaleAnim }],
          }}
        >
          <View
            style={[
              styles.boardWrapper,
              { height: getBoardHeight(PANELS.length) },
            ]}
          >
            {PANELS.map((p, idx) => (
              <Pressable
                key={p.id}
                style={[styles.panel, { width: panelSize }]}
                onPress={() => handlePanelPress(idx)}
              >
                <Image source={p.uri} style={styles.panelImg} />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Enhanced Actions */}
      <View style={[styles.actionsRow, isIPad && styles.actionsRowTablet]}>
        {(
          [
            { icon: "share", onPress: handleShare, color: "#7F9CF5" },
            { icon: "download", onPress: handleDownload, color: "#4ECDC4" },
            {
              icon: "trash",
              onPress: deleteComic,
              color: "rgba(255, 77, 77, 0.69)",
            },
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

      {/* Enhanced Modal viewer */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <LinearGradient
          colors={[
            "rgba(13,10,60,0.95)",
            "rgba(13,10,60,0.8)",
            "rgba(0,0,0,0.9)",
          ]}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Pressable
              style={[
                styles.modalCloseBtn,
                isIPad && styles.modalCloseBtnTablet,
              ]}
              onPress={() => {
                triggerHaptic("light");
                setIsModalVisible(false);
              }}
            >
              <Ionicons
                name="close"
                size={getResponsiveValue(28, 40)}
                color="#fff"
              />
            </Pressable>
            <Text style={styles.modalTitle}>
              Panel {selectedPanelIndex + 1} of {PANELS.length}
            </Text>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / Dimensions.get("window").width
              );
              setSelectedPanelIndex(newIndex);
              triggerHaptic("light");
            }}
            contentOffset={{
              x: selectedPanelIndex * Dimensions.get("window").width,
              y: 0,
            }}
          >
            {PANELS.map((p, i) => (
              <View key={i} style={styles.swipePanel}>
                <Image
                  source={p.uri}
                  style={[styles.swipeImage, isIPad && styles.swipeImageTablet]}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Panel indicators */}
          <View style={styles.panelIndicators}>
            {PANELS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  i === selectedPanelIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        </LinearGradient>
      </Modal>
    </ScreenLayout>
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
    top: 60,
    left: 0,
    right: 0,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    zIndex: 1,
  },
  headerTablet: {
    height: 80,
    paddingTop: 32,
    paddingLeft: 32,
    paddingRight: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    paddingTop: 20, // Reduced top padding
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
  modalContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHeader: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 50,
    alignItems: "center",
  },
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
  modalTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
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
  dateText: {
    color: "#B0B0B0",
    fontSize: 14,
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#E0B0FF",
    fontSize: 18,
    marginTop: 20,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#FF4EE0",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  panelIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: "#FF4EE0",
    width: 15,
    height: 15,
  },
  titleSection: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 10,
  },
});
