import React, { useState, useRef, useEffect } from "react";
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
import { supabase } from "../../utils/supabase";
import { useRouter } from "expo-router";
import Background from "@/components/ui/Background";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { useUser } from "../../context/UserContext";

import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import DottedSphere from "../../components/SphereVisualizer"; // Adjust path if needed

const AnimatedView = Animated.createAnimatedComponent(View);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

type AppMode = "idle" | "typing" | "recording" | "review";

const EnhancedDashboardScreen: React.FC = () => {
  const router = useRouter();
  const { profile, session } = useUser();

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

  const dashboardOpacity = useSharedValue(1);
  const morphProgress = useSharedValue(0);
  const micOpacity = useSharedValue(1);
  const audioLevel = useSharedValue(0);

  const inputRef = useRef<TextInput>(null);
  const tick = useRef<any>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  useEffect(() => {
    Audio.requestPermissionsAsync();
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const dashboardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dashboardOpacity.value,
    // The dashboard UI should not be interactive when faded out
    transform: [{ scale: dashboardOpacity.value === 0 ? 0 : 1 }],
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    opacity: micOpacity.value,
    transform: [{ scale: micOpacity.value }],
  }));

  const startRecording = async () => {
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

    dashboardOpacity.value = withTiming(0, { duration: 400 });
    micOpacity.value = withTiming(0, { duration: 400 });
    morphProgress.value = withTiming(1, { duration: 800 });

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
    dashboardOpacity.value = withTiming(1, { duration: 600 });
    micOpacity.value = withTiming(1, { duration: 600 });
    morphProgress.value = withTiming(0, { duration: 600 });
    audioLevel.value = withTiming(0, { duration: 600 });

    setMode("idle");
    setTimer("0:00");
    setRecordingStatus("Ready to record your dream!");
    setRecordingUri(null);
    setDreamText("");
    Keyboard.dismiss();
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    if (tick.current) clearInterval(tick.current);
  };

  const handlePressCentralButton = () => {
    if (mode === "idle" || mode === "typing") {
      startRecording();
    } else if (mode === "recording") {
      stopRecording();
    }
  };

  const handleUploadText = async () => {
    if (!dreamText.trim() || isLoading) {
      setIsLoading(true);
      Keyboard.dismiss();
    }

    try {
      const backendURL = "https://dreamtoon.onrender.com/generate-comic/";
      const response = await fetch(backendURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          story: dreamText.trim(),
          num_panels: 6,
          style_name: "american",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to start comic");

      router.push({
        pathname: "/(tab)/ProcessingScreen",
        params: { dream_id: data.dream_id },
      });
    } catch (e) {
      console.error("counldnt upload the text", e);
    } finally {
      setIsLoading(false);
      setDreamText("");
    }
  };
  const handleUploadRecording = async () => {
    if (!recordingUri || isLoading) return;
    setIsLoading(true);

    try {
      const backendURL = "https://dreamtoon.onrender.com/generate-comic/";
      const formData = new FormData();
      formData.append("audio_file", {
        uri: recordingUri,
        type: "audio/wav", // Assuming your audio is in WAV format
        name: "recording.wav",
      } as any); // Use 'any' or define a proper type if needed
      formData.append("story", dreamText.trim());
      formData.append("num_panels", "6");
      formData.append("style_name", "american");

      const response = await fetch(backendURL, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
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
    } catch (e) {
      console.error("counldnt upload the recording", e);
    } finally {
      setIsLoading(false);
      setRecordingUri(null);
    }
  };

  return (
    <Background source={require("../../assets/images/stars.png")}>
      <LinearGradient colors={["#230B3D", "#12081C"]} style={styles.container}>
        <AnimatedView style={[styles.fullScreen, dashboardAnimatedStyle]}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => router.push("/(tab)/SettingScreen")}
          >
            <Ionicons
              name="settings"
              size={getResponsiveValue(20, 28)}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={styles.greetingWrapper}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.greetingNameText}>
              {profile?.name ?? "Dreamer"}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              setMode("typing");
              dashboardOpacity.value = withTiming(0);
            }}
            style={styles.typeInsteadWrapper}
          >
            <Text style={styles.typeInstead}>Want to type instead?</Text>
          </Pressable>
          <View style={[styles.navBar, isIPad && styles.navBarTablet]}>
            <Pressable
              style={styles.navBtn}
              onPress={() => router.push("/(tab)/EnhancedDashboardScreen")}
            >
              <Ionicons
                name="home"
                size={getResponsiveValue(24, 32)}
                color="#FFFFFF"
              />
            </Pressable>
            <Pressable
              style={styles.navBtn}
              onPress={() => router.push("/(tab)/TimelineScreen")}
            >
              <Ionicons
                name="book"
                size={getResponsiveValue(24, 32)}
                color="#C879FF"
              />
            </Pressable>
          </View>
        </AnimatedView>

        {/* FIX: The sphere is now positioned absolutely behind the button */}
        {containerCenter.x > 0 && (
          <DottedSphere
            level={audioLevel}
            centerX={containerCenter.x}
            centerY={containerCenter.y}
            morphProgress={morphProgress}
          />
        )}

        {/* FIX: The TouchableOpacity now dynamically changes size and contains the visuals */}
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
          <AnimatedView style={[styles.micVisuals, micAnimatedStyle]}>
            <Ionicons
              name="mic"
              size={getResponsiveValue(60, 80)}
              color="#8663DF"
            />
          </AnimatedView>
        </TouchableOpacity>

        {mode === "typing" && (
          <View style={styles.inputModeWrapper}>
            <Pressable style={styles.headerBtn} onPress={handleFullReset}>
              <Ionicons
                name="close"
                size={getResponsiveValue(20, 28)}
                color="#FFFFFF"
              />
            </Pressable>
            <View
              style={[styles.inputWrapper, isIPad && styles.inputWrapperTablet]}
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
              <ShinyGradientButton onPress={handleUploadText}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  "Create Comic"
                )}
              </ShinyGradientButton>
            </View>
          </View>
        )}

        {mode === "review" && (
          <View style={styles.reviewModeWrapper}>
            <Text style={styles.statusText}>{recordingStatus}</Text>
            <Text style={styles.timerText}>Total Time: {timer}</Text>
            <View style={styles.reviewActions}>
              <ShinyGradientButton onPress={handleUploadRecording}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  "Create Comic"
                )}
              </ShinyGradientButton>
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
    </Background>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    paddingTop: 60,
  },

  // FIX: The base style for the central button, centered in the screen
  centralButton: {
    position: "absolute",
    width: getResponsiveValue(120, 180),
    height: getResponsiveValue(120, 180),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  // FIX: The style that gets applied to make the button full screen
  fullScreenPressable: {
    width: "100%",
    height: "100%",
  },
  // FIX: The visual style for the mic button, now separate from the pressable area
  micVisuals: {
    width: "100%",
    height: "100%",
    borderRadius: getResponsiveValue(60, 90),
    backgroundColor: "rgba(134, 99, 223, 0.1)",
    borderWidth: 4,
    borderColor: "rgba(134, 99, 223, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerBtn: { position: "absolute", top: 50, left: 20, zIndex: 10 },
  greetingWrapper: { marginTop: 60 },
  greetingText: {
    fontSize: getResponsiveValue(40, 56),
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  greetingNameText: {
    fontSize: getResponsiveValue(40, 56),
    color: "#C879FF",
    fontWeight: "700",
    textAlign: "center",
  },
  typeInsteadWrapper: { paddingBottom: 20 },
  typeInstead: {
    color: "#D1A8C5",
    fontSize: getResponsiveValue(16, 20),
    textDecorationLine: "underline",
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
    borderColor: "rgba(200, 121, 255, 0.5)",
    backgroundColor: "rgba(35, 11, 61, 0.7)",
    color: "#FFFFFF",
    padding: 16,
    textAlignVertical: "top",
    marginBottom: 16,
    fontSize: getResponsiveValue(16, 18),
  },
  inputTablet: { height: 300, borderRadius: 24, padding: 20, marginBottom: 20 },
  charCount: {
    color: "#D1A8C5",
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
    color: "#D1A8C5",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  reviewActions: { width: "90%", maxWidth: 350, gap: 20 },
  closeReviewBtn: { position: "absolute", top: 60, right: 20 },
});

export default EnhancedDashboardScreen;
