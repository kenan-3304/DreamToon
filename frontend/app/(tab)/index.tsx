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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { supabase } from "../../utils/supabase";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Background from "@/components/ui/Background";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { StyleSelector } from "../../components/StyleSelector";
import { useUser } from "../../context/UserContext";
import { dashboardUtils } from "@/utils/dashboardUtils";

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
  const { profile, session, updateProfile, refetchProfileAndData } = useUser();

  const [mode, setMode] = useState<AppMode>("idle");
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

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh profile data to ensure avatar and timer are up to date
      refetchProfileAndData();
    }, [refetchProfileAndData])
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

  const inputRef = useRef<TextInput>(null);
  const tick = useRef<any>(null);

  // Enhanced greeting with animation
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Animate greeting on mount
  useEffect(() => {
    greetingOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    greetingScale.value = withSpring(1, { damping: 15, stiffness: 100 });
  }, []);

  useEffect(() => {
    Audio.requestPermissionsAsync();

    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

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
      setMode("review");
    } catch (e) {
      console.error("Stop recording failed", e);
    }
  };

  const handleFullReset = () => {
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

  const enterStyleSelection = () => {
    triggerHaptic("light");
    setPreviousMode(mode);
    setMode("style-selection");
  };

  const handleStyleSelection = (style: { name: string; prompt: string }) => {
    triggerHaptic("light");
    setSelectedStyle(style.name);
    setMode(previousMode);
  };

  const handlePressCentralButton = () => {
    if (mode === "idle" || mode === "typing") {
      startRecording();
    } else if (mode === "recording") {
      stopRecording();
    }
  };

  const handleUploadText = async () => {
    if (!(await dashboardUtils.canUpload(profile, router, updateProfile))) {
      return;
    }

    if (!selectedStyle) {
      setMode("style-selection");
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
      formData.append("style_name", selectedStyle);

      const response = await fetch(backendURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to start comic");

      router.push({
        pathname: "/(tab)/ProcessingScreen",
        params: { dream_id: data.dream_id },
      });
    } catch (e: any) {
      console.error("counldnt upload the text", e.message);
      Alert.alert(
        "Upload Failed",
        e.message || "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
      setDreamText("");
      setSelectedStyle(null);
    }
  };

  const handleUploadRecording = async () => {
    if (!(await dashboardUtils.canUpload(profile, router, updateProfile))) {
      return;
    }

    if (!selectedStyle) {
      setMode("style-selection");
      return;
    }

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
    formData.append("style_name", selectedStyle);

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
      if (!response.ok) throw new Error(data.detail || "Failed to start comic");

      router.push({
        pathname: "/(tab)/ProcessingScreen",
        params: { dream_id: data.dream_id },
      });
    } catch (e: any) {
      console.error("counldnt upload the recording", e);
      Alert.alert(
        "Upload Failed",
        e.message || "An unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
      setRecordingUri(null);
      setSelectedStyle(null);
    }
  };

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      <AnimatedView style={[styles.fullScreen, dashboardAnimatedStyle]}>
        <AnimatedView style={[styles.greetingWrapper, greetingAnimatedStyle]}>
          <Text style={styles.greetingText}>{greeting},</Text>
          <Text style={styles.greetingNameText}>
            {profile?.name ?? "Dreamer"}
          </Text>
        </AnimatedView>
        <View style={{ flex: 1 }} />
      </AnimatedView>

      {containerCenter.x > 0 && (
        <DottedSphere
          level={audioLevel}
          centerX={containerCenter.x}
          centerY={containerCenter.y}
          morphProgress={morphProgress}
        />
      )}

      <TouchableOpacity
        style={[
          styles.centralButton,
          mode === "recording" && styles.fullScreenPressable,
        ]}
        activeOpacity={0.9}
        onPress={handlePressCentralButton}
        disabled={mode === "review" || mode === "typing"}
        onLayout={(event) => {
          if (containerCenter.x === 0) {
            const { x, y, width, height } = event.nativeEvent.layout;
            setContainerCenter({ x: x + width / 2, y: y + height / 2 });
          }
        }}
      >
        {/* Enhanced ripple effect */}
        <AnimatedView style={[styles.micRipple, rippleAnimatedStyle]} />

        {/* Enhanced glow effect */}
        <AnimatedView style={[styles.micGlow, micGlowAnimatedStyle]} />

        {/* Enhanced mic visuals */}
        <AnimatedView style={[styles.micVisuals, micAnimatedStyle]}>
          <Ionicons
            name="mic-outline"
            size={getResponsiveValue(60, 80)}
            color="rgba(192, 170, 216, 0.98)"
          />
        </AnimatedView>
      </TouchableOpacity>

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

      {mode === "typing" && (
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
            style={[styles.inputWrapper, isIPad && styles.inputWrapperTablet]}
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
            <Text style={[styles.charCount, isIPad && styles.charCountTablet]}>
              {dreamText.length}/2000
            </Text>
            <View style={styles.buttonContainer}>
              <ShinyGradientButton
                onPress={handleUploadText}
                disabled={!selectedStyle}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : selectedStyle ? (
                  "Create Comic"
                ) : (
                  "Choose Style First"
                )}
              </ShinyGradientButton>
              {!selectedStyle && (
                <ShinyGradientButton onPress={enterStyleSelection}>
                  Choose Style
                </ShinyGradientButton>
              )}
            </View>
          </Pressable>
        </Pressable>
      )}

      {mode === "style-selection" && (
        <View style={styles.styleSelectionWrapper}>
          <StyleSelector
            onStyleSelect={handleStyleSelection}
            mode="selection"
            onClose={handleFullReset}
          />
        </View>
      )}

      {mode === "review" && (
        <View style={styles.reviewModeWrapper}>
          <Text style={styles.statusText}>{recordingStatus}</Text>
          <Text style={styles.timerText}>Total Time: {timer}</Text>
          {selectedStyle && (
            <Text style={styles.selectedStyleText}>Style: {selectedStyle}</Text>
          )}
          <View style={styles.reviewActions}>
            <ShinyGradientButton
              onPress={handleUploadRecording}
              disabled={!selectedStyle}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : selectedStyle ? (
                "Create Comic"
              ) : (
                "Choose Style First"
              )}
            </ShinyGradientButton>
            {!selectedStyle && (
              <ShinyGradientButton onPress={enterStyleSelection}>
                Choose Style
              </ShinyGradientButton>
            )}
            <ShinyGradientButton onPress={handleFullReset}>
              Record Again
            </ShinyGradientButton>
          </View>
          <Pressable style={styles.closeReviewBtn} onPress={handleFullReset}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    paddingTop: 60,
  },
  centralButton: {
    position: "absolute",
    width: getResponsiveValue(120, 180),
    height: getResponsiveValue(120, 180),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
  greetingWrapper: { marginTop: 60 },
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
    backgroundColor: "#12081C",
    zIndex: 20,
  },
  inputWrapper: { width: "90%", maxWidth: 350 },
  inputWrapperTablet: { maxWidth: 500 },
  input: {
    height: 200,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#FFFFFF",
    padding: 16,
    textAlignVertical: "top",
    marginBottom: 16,
    fontSize: getResponsiveValue(16, 18),
  },
  inputTablet: { height: 300, borderRadius: 24, padding: 20, marginBottom: 20 },
  charCount: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
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
  reviewActions: { width: "90%", maxWidth: 350, gap: 20 },
  closeReviewBtn: { position: "absolute", top: 60, right: 20 },
  styleSelectionWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#12081C",
    zIndex: 20,
  },
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
});

export default EnhancedDashboardScreen;
