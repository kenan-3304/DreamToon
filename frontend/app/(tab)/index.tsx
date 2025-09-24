import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { supabase } from "../../utils/supabase";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { StyleSelector } from "../../components/StyleSelector";
import { useUser } from "../../context/UserContext";
import { dashboardUtils } from "@/utils/dashboardUtils";
import { ScreenLayout } from "@/components/ScreenLayout";

import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  useAnimatedStyle,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import DottedSphere from "../../components/SphereVisualizer";

const AnimatedView = Animated.createAnimatedComponent(View);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

type AppMode = "idle" | "typing" | "recording" | "review" | "style-selection";

const EnhancedDashboardScreen: React.FC = () => {
  const router = useRouter();
  const {
    profile,
    session,
    updateProfile,
    refetchProfileAndData,
    addPendingComic,
    unlockedStyles,
    loading,
  } = useUser();

  const [mode, setMode] = useState<AppMode>("idle");
  const [showReviewOptions, setShowReviewOptions] = useState(false);

  const [dreamText, setDreamText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [timer, setTimer] = useState("0:00");
  const [recordingStatus, setRecordingStatus] = useState(
    "Ready to record your dream!"
  );
  const [containerCenter, setContainerCenter] = useState({ x: 0, y: 0 });
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [previousMode, setPreviousMode] = useState<AppMode>("idle");
  const [lastProfileRefresh, setLastProfileRefresh] = useState(0);

  const autoSelectedStyle = useMemo(() => {
    // If the necessary data isn't loaded, there's no style to select.
    if (!profile || !unlockedStyles) {
      return null;
    }

    // Logic is the same as before, but we just return the value.
    if (unlockedStyles.length === 1) {
      return unlockedStyles[0];
    }
    if (profile.avatar_style && unlockedStyles.includes(profile.avatar_style)) {
      return profile.avatar_style;
    }
    if (unlockedStyles.length > 0) {
      return unlockedStyles[0];
    }

    return null;
  }, [profile, unlockedStyles]); // This will only re-calculate when profile or styles change.

  // Refresh profile data when screen comes into focus (with debouncing)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if it's been more than 30 seconds since last refresh
      const now = Date.now();
      if (now - lastProfileRefresh > 60000) {
        setLastProfileRefresh(now);
        refetchProfileAndData();
      }
    }, [refetchProfileAndData, lastProfileRefresh])
  );

  // Enhanced animation values
  const dashboardOpacity = useSharedValue(1);
  const morphProgress = useSharedValue(0);
  const micOpacity = useSharedValue(1);
  const audioLevel = useSharedValue(0);
  const micScale = useSharedValue(1);
  const micGlow = useSharedValue(0);
  const micRotation = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const greetingScale = useSharedValue(1);
  const greetingOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const inputRef = useRef<TextInput>(null);
  const tick = useRef<any>(null);

  // Enhanced greeting with animation
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  useEffect(() => {
    Audio.requestPermissionsAsync();

    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  useEffect(() => {
    // This entire block will only run AFTER the profile data has been loaded.
    if (profile) {
      // Animate the greeting
      greetingOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      greetingScale.value = withSpring(1, { damping: 15, stiffness: 100 });

      // Animate the main content area
      contentOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [profile]); // This effect now controls ALL initial animations.

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      // We add a slight scale-up to make the entrance feel more dynamic
      transform: [
        { scale: interpolate(contentOpacity.value, [0, 1], [0.98, 1]) },
      ],
    };
  });

  // Enhanced mic animations with smooth breathing and ripple effects
  useEffect(() => {
    if (mode !== "idle") return;

    let isActive = true;
    let animationInterval: number;

    const startMicAnimation = () => {
      // Smooth breathing effect without rotation
      micScale.value = withTiming(1.06, {
        duration: 2500,
        easing: Easing.inOut(Easing.ease),
      });
      micGlow.value = withTiming(0.7, {
        duration: 2500,
        easing: Easing.inOut(Easing.ease),
      });

      // Subtle ripple effect
      rippleScale.value = withTiming(1.3, { duration: 2500 });
      rippleOpacity.value = withTiming(0.2, { duration: 1250 }, () => {
        rippleOpacity.value = withTiming(0, { duration: 1250 });
      });

      animationInterval = setTimeout(() => {
        if (isActive) {
          micScale.value = withTiming(1, {
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
          });
          micGlow.value = withTiming(0, {
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
          });

          setTimeout(() => {
            if (isActive) startMicAnimation();
          }, 2500);
        }
      }, 2500);
    };

    startMicAnimation();

    return () => {
      isActive = false;
      if (animationInterval) clearTimeout(animationInterval);
    };
  }, [mode]);

  // Enhanced animated styles
  const dashboardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dashboardOpacity.value,
    transform: [{ scale: dashboardOpacity.value === 0 ? 0 : 1 }],
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    opacity: micOpacity.value,
    transform: [{ scale: micScale.value }],
  }));

  const micGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: micGlow.value,
    transform: [{ scale: 1.3 + micGlow.value * 0.4 }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  const greetingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ scale: greetingScale.value }],
  }));

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

  const startRecording = async () => {
    setShowReviewOptions(false);

    triggerHaptic("medium");

    const { status } = await Audio.getPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Microphone access is needed to record dreams."
      );
      return;
    }

    setMode("recording");
    setRecordingStatus("🎙️ Recording your dream...");

    // Enhanced animations
    dashboardOpacity.value = withTiming(0, { duration: 400 });
    micOpacity.value = withTiming(0, { duration: 400 });
    morphProgress.value = withTiming(1, { duration: 800 });

    micScale.value = withSpring(1.2, { damping: 15, stiffness: 100 });
    micGlow.value = withTiming(0, { duration: 200 });

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && typeof status.metering === "number") {
            let normalized = Math.max(0, 1 + status.metering / 50);
            if (normalized < 0.1) normalized = 0;
            audioLevel.value = withTiming(normalized, { duration: 120 });
          }
        },
        100
      );
      setRecording(newRecording);

      const t0 = Date.now();
      tick.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setTimer(
          `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
        );
      }, 500);
    } catch (e) {
      console.error("Recording failed", e);
    }
  };

  const stopRecording = async () => {
    triggerHaptic("light");

    if (tick.current) clearInterval(tick.current);
    if (!recording) return;

    setRecordingStatus("✅ Recording saved! Ready to create.");

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setMode("idle");
      setShowReviewOptions(true);
    } catch (e) {
      console.error("Stop recording failed", e);
    }
  };

  const handleFullReset = () => {
    setShowReviewOptions(false);
    triggerHaptic("light");

    dashboardOpacity.value = withTiming(1, { duration: 600 });
    micOpacity.value = withTiming(1, { duration: 600 });
    morphProgress.value = withTiming(0, { duration: 600 });
    audioLevel.value = withTiming(0, { duration: 600 });

    micScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    micGlow.value = withTiming(0, { duration: 600 });

    setMode("idle");
    setTimer("0:00");
    setRecordingStatus("Ready to record your dream!");
    setRecordingUri(null);
    setDreamText("");
    setSelectedStyle(null);
    Keyboard.dismiss();
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    if (tick.current) clearInterval(tick.current);
  };

  const handleRecordAgain = () => {
    handleFullReset();

    setTimeout(() => {
      startRecording();
    }, 100);
  };

  const enterStyleSelection = () => {
    triggerHaptic("light");
    setPreviousMode(mode);
    setMode("style-selection");
  };

  const handleStyleSelection = (style: { name: string; prompt: string }) => {
    triggerHaptic("light");
    setSelectedStyle(style.name);

    updateProfile({ avatar_style: style.name });

    if (showReviewOptions) {
      setMode("idle");
    } else {
      setMode(previousMode);
    }
  };

  const handlePressCentralButton = () => {
    if (mode === "idle") {
      startRecording();
    } else if (mode === "recording") {
      stopRecording();
    }
  };

  const handleUploadText = async () => {
    if (!(await dashboardUtils.canUpload(profile, router, updateProfile))) {
      return;
    }

    const styleToUse = selectedStyle || autoSelectedStyle;

    if (!styleToUse) {
      // This fallback should rarely be needed now, but it's good practice
      Alert.alert("Please select a style first.");
      enterStyleSelection();
      return;
    }

    if (!dreamText.trim() || isLoading) {
      return;
    }

    triggerHaptic("medium");
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const backendURL = "https://dreamtoon.onrender.com/generate-comic/";

      const formData = new FormData();

      formData.append("story", dreamText.trim());
      formData.append("num_panels", "6");
      formData.append("style_name", styleToUse);

      console.log("--- Sending this JWT to Render ---");
      console.log(session?.access_token); // Add this line

      const response = await fetch(backendURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        // Handle enhanced error responses
        if (data.detail && typeof data.detail === "object") {
          // New error format with categorization
          const errorDetail = data.detail;
          throw new Error(
            JSON.stringify({
              type: errorDetail.error_type || "unknown",
              title: errorDetail.title || "Upload Failed",
              message: errorDetail.message || "An unexpected error occurred.",
              details: errorDetail.details || errorDetail.message,
            })
          );
        } else {
          // Fallback to old error format
          throw new Error(data.detail || "Failed to start comic");
        }
      }

      await addPendingComic(data.dream_id);
      setMode("idle");

      router.push({
        pathname: "/(tab)/ProcessingScreen",
        params: { dream_id: data.dream_id },
      });
    } catch (e: any) {
      console.error("Couldn't upload the text", e.message);

      // Parse enhanced error messages
      let errorTitle = "Upload Failed";
      let errorMessage = "An unexpected error occurred.";

      try {
        const errorData = JSON.parse(e.message);
        if (errorData.type && errorData.title && errorData.message) {
          errorTitle = errorData.title;
          errorMessage = errorData.message;
        } else {
          errorMessage = e.message;
        }
      } catch {
        // If parsing fails, use the original error message
        errorMessage = e.message;
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
      handleFullReset();
    }
  };

  const handleUploadRecording = async () => {
    if (!(await dashboardUtils.canUpload(profile, router, updateProfile))) {
      return;
    }

    const styleToUse = selectedStyle || autoSelectedStyle;

    if (!styleToUse) {
      Alert.alert("Please select a style first.");
      enterStyleSelection();
      return;
    }

    // if (!selectedStyle) {
    //   setMode("style-selection");
    //   return;
    // }

    if (!recordingUri || isLoading) return;

    triggerHaptic("medium");
    setIsLoading(true);

    const formData = new FormData();
    const uri = Platform.OS === "ios" ? recordingUri : `file://${recordingUri}`;

    formData.append("audio_file", {
      uri: uri,
      name: "recording.m4a",
      type: "audio/m4a",
    } as any);

    formData.append("num_panels", "6");
    formData.append("style_name", styleToUse);

    try {
      const backendURL = "https://dreamtoon.onrender.com/generate-comic/";

      const response = await fetch(backendURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        // Handle enhanced error responses
        if (data.detail && typeof data.detail === "object") {
          // New error format with categorization
          const errorDetail = data.detail;
          throw new Error(
            JSON.stringify({
              type: errorDetail.error_type || "unknown",
              title: errorDetail.title || "Upload Failed",
              message: errorDetail.message || "An unexpected error occurred.",
              details: errorDetail.details || errorDetail.message,
            })
          );
        } else {
          // Fallback to old error format
          throw new Error(data.detail || "Failed to start comic");
        }
      }

      await addPendingComic(data.dream_id);

      router.push({
        pathname: "/(tab)/ProcessingScreen",
        params: { dream_id: data.dream_id },
      });
    } catch (e: any) {
      console.error("Couldn't upload the recording", e);

      // Parse enhanced error messages
      let errorTitle = "Upload Failed";
      let errorMessage = "An unexpected error occurred.";

      try {
        const errorData = JSON.parse(e.message);
        if (errorData.type && errorData.title && errorData.message) {
          errorTitle = errorData.title;
          errorMessage = errorData.message;
        } else {
          errorMessage = e.message;
        }
      } catch {
        // If parsing fails, use the original error message
        errorMessage = e.message;
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
      handleFullReset();
      // setRecordingUri(null);
      // setSelectedStyle(null);
    }
  };

  return (
    <ScreenLayout>
      <Animated.View style={[{ flex: 1, width: "100%" }, contentAnimatedStyle]}>
        <View style={styles.container}>
          <AnimatedView style={[styles.fullScreen, dashboardAnimatedStyle]}>
            <AnimatedView
              style={[styles.greetingWrapper, greetingAnimatedStyle]}
            >
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.greetingNameText}>
                {profile?.name ?? "Dreamer"}
              </Text>
            </AnimatedView>

            {/* UI to display style and change button */}
            {mode === "idle" && !showReviewOptions && autoSelectedStyle && (
              <TouchableOpacity
                style={styles.styleInfoContainer}
                onPress={
                  unlockedStyles && unlockedStyles.length > 1
                    ? enterStyleSelection
                    : null
                }
                disabled={!unlockedStyles || unlockedStyles.length <= 1}
              >
                <Text style={styles.styleInfoText}>
                  Style: {selectedStyle || autoSelectedStyle}
                </Text>
                {unlockedStyles && unlockedStyles.length > 1 && (
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color="#E0B0FF"
                  />
                )}
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />
          </AnimatedView>

          {containerCenter.x > 0 && (
            <DottedSphere
              level={audioLevel}
              centerX={SCREEN_WIDTH / 2}
              centerY={SCREEN_HEIGHT / 2 - 70}
              morphProgress={morphProgress}
              showHint={mode === "recording"}
            />
          )}

          {/* This area now conditionally renders the mic OR the review options */}
          <View style={styles.centralActionArea}>
            {showReviewOptions ? (
              // The new in-place review options UI
              <AnimatedView style={styles.reviewActions}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleFullReset}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <ShinyGradientButton onPress={handleUploadRecording}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    "Generate"
                  )}
                </ShinyGradientButton>
                <View style={styles.secondaryActionsContainer}>
                  <TouchableOpacity
                    onPress={handleRecordAgain}
                    style={styles.secondaryButton}
                  >
                    <Ionicons name="refresh" size={24} color="#FFFFFF" />
                    <Text style={styles.secondaryButtonText}>Record Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={enterStyleSelection}
                    style={styles.secondaryButton}
                  >
                    <Ionicons
                      name="color-palette-outline"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.secondaryButtonText}>
                      Current Style: {"\n"}
                      {selectedStyle || autoSelectedStyle}
                    </Text>
                  </TouchableOpacity>
                </View>
              </AnimatedView>
            ) : (
              // The original microphone button
              <TouchableOpacity
                style={styles.centralButton}
                activeOpacity={0.9}
                onPress={handlePressCentralButton}
                disabled={mode === "typing"}
                onLayout={(event) => {
                  if (containerCenter.x === 0) {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    setContainerCenter({
                      x: x + width / 2,
                      y: y + height / 2,
                    });
                  }
                }}
              >
                <AnimatedView style={[styles.micRipple, rippleAnimatedStyle]} />
                <AnimatedView style={[styles.micGlow, micGlowAnimatedStyle]} />
                <AnimatedView style={[styles.micVisuals, micAnimatedStyle]}>
                  <Ionicons
                    name="mic-outline"
                    size={getResponsiveValue(60, 80)}
                    color="rgba(192, 170, 216, 0.98)"
                  />
                </AnimatedView>
              </TouchableOpacity>
            )}
          </View>

          {unlockedStyles && unlockedStyles.length === 0 && mode === "idle" && (
            <View style={styles.noStylesContainer}>
              <Text style={styles.noStylesText}>
                Create an avatar first to unlock comic styles!
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tab)/AvatarStudioScreen")}
                style={styles.noStylesButton}
              >
                <Text style={styles.noStylesButtonText}>
                  Go to Avatar Studio
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Pressable
            onPress={() => {
              triggerHaptic("light");
              setMode("typing");
              dashboardOpacity.value = withTiming(0);
            }}
            style={styles.typeInsteadWrapper}
          >
            <Text style={styles.typeInstead}>Want to type instead?</Text>
          </Pressable>

          <Modal
            visible={mode === "typing"}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleFullReset}
          >
            <LinearGradient
              colors={["#12081C", "#0D0A3C"]}
              style={styles.inputModeWrapper}
            >
              <Pressable
                style={styles.inputModeWrapper}
                onPress={() => Keyboard.dismiss()}
              >
                <Pressable style={styles.headerBtn} onPress={handleFullReset}>
                  <Ionicons
                    name="close"
                    size={getResponsiveValue(20, 28)}
                    color="#FFFFFF"
                  />
                </Pressable>
                <Pressable
                  style={[
                    styles.inputWrapper,
                    isIPad && styles.inputWrapperTablet,
                  ]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <TextInput
                    ref={inputRef}
                    value={dreamText}
                    onChangeText={setDreamText}
                    placeholder="Describe your dream…"
                    placeholderTextColor="#D1A8C5"
                    multiline
                    maxLength={2000}
                    style={[styles.input, isIPad && styles.inputTablet]}
                  />
                  <Text
                    style={[styles.charCount, isIPad && styles.charCountTablet]}
                  >
                    {dreamText.length}/2000
                  </Text>
                  <View style={styles.buttonContainer}>
                    <ShinyGradientButton
                      onPress={handleUploadText}
                      // The button is now enabled if any style is available
                      disabled={
                        !(selectedStyle || autoSelectedStyle) || isLoading
                      }
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        "Create Comic"
                      )}
                    </ShinyGradientButton>

                    {/* This button now shows the current style and allows changing it */}
                    <TouchableOpacity
                      onPress={enterStyleSelection}
                      style={styles.modalChangeStyleButton}
                    >
                      <Text style={styles.modalChangeStyleText}>
                        Style: {selectedStyle || autoSelectedStyle || "None"}
                      </Text>
                      <Ionicons
                        name="chevron-forward-outline"
                        size={16}
                        color="#E0B0FF"
                      />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </LinearGradient>
          </Modal>

          <Modal
            visible={mode === "style-selection"}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleFullReset}
          >
            <StyleSelector
              onStyleSelect={handleStyleSelection}
              mode="selection"
              onClose={handleFullReset}
            />
          </Modal>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
};

// --- StyleSheet ---
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    paddingTop: 60,
  },
  centralButton: {
    width: getResponsiveValue(120, 180),
    height: getResponsiveValue(120, 180),
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenPressable: {
    width: "100%",
    height: "100%",
  },
  micVisuals: {
    width: "100%",
    height: "100%",
    borderRadius: getResponsiveValue(60, 90),
    backgroundColor: "rgba(192, 171, 244, 0.2)",
    borderWidth: 3,
    borderColor: "rgba(185, 166, 231, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8663DF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  micGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: getResponsiveValue(60, 90),
    backgroundColor: "rgba(161, 136, 225, 0.3)",
    shadowColor: "#8663DF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  micRipple: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: getResponsiveValue(60, 90),
    borderWidth: 2,
    borderColor: "rgba(179, 158, 231, 0.5)",
  },
  headerBtn: { position: "absolute", top: 50, left: 20, zIndex: 10 },
  greetingWrapper: { marginTop: 10 },
  greetingText: {
    fontSize: getResponsiveValue(40, 56),
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  greetingNameText: {
    fontSize: getResponsiveValue(40, 56),
    color: "#E0B0FF",
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  typeInsteadWrapper: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    zIndex: 20, // Ensure it's above the review options
  },
  typeInstead: {
    color: "#FFFFFF",
    fontSize: getResponsiveValue(16, 20),
    textDecorationLine: "underline",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  navBar: {
    width: "90%",
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(13,10,60,0.8)",
    borderWidth: 1,
    borderColor: "rgba(251, 251, 251, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  navBtn: { padding: 8 },
  inputModeWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  inputWrapper: { width: "90%", maxWidth: 350 },
  inputWrapperTablet: { maxWidth: 500 },
  input: {
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(224, 176, 255, 0.4)",
    backgroundColor: "rgba(13, 10, 60, 0.5)",
    color: "#FFFFFF",
    padding: 16,
    textAlignVertical: "top",
    marginBottom: 16,
    fontSize: getResponsiveValue(16, 18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  inputTablet: { height: 300, borderRadius: 24, padding: 20, marginBottom: 20 },
  charCount: {
    color: "#E0B0FF",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  charCountTablet: { fontSize: 16, marginBottom: 20 },
  reviewModeWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(18, 8, 28, 0.9)",
    zIndex: 20,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  timerText: {
    color: "#E0B0FF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  closeReviewBtn: { position: "absolute", top: 60, right: 20 },
  selectedStyleText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 20,
    alignItems: "center",
  },
  centralActionArea: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 250, // Give it enough height to contain all buttons
    top: 280, // Position it vertically
    zIndex: 10,
  },
  styleInfoContainer: {
    marginTop: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  styleInfoText: {
    color: "#FFFFFF",
    fontSize: getResponsiveValue(16, 18),
    fontWeight: "600",
    marginRight: 10,
  },
  changeStyleButton: {
    color: "#E0B0FF",
    fontSize: getResponsiveValue(16, 18),
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  reviewActions: {
    width: "90%",
    maxWidth: 350,
    alignItems: "center",
    gap: 15, // A little space between main and secondary buttons
  },
  secondaryActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  noStylesContainer: {
    position: "absolute",
    bottom: 200,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  noStylesText: {
    color: "#FFD6D6",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 15,
  },
  noStylesButton: {
    backgroundColor: "#E0B0FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  noStylesButtonText: {
    color: "#12081C",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: -320,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 30,
  },
  currentStyleText: {
    color: "#B0B0B0",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    right: 110,
    top: 20,
    textAlign: "center",
    alignSelf: "center",
  },
  modalChangeStyleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    padding: 10,
    gap: 5,
  },
  modalChangeStyleText: {
    color: "#E0B0FF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
export default EnhancedDashboardScreen;
