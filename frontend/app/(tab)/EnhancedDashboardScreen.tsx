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
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../utils/supabase";
import { useRouter } from "expo-router";
import Background from "@/components/ui/Background";

// iPad detection
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const DEBUG = (process.env.DEBUG ?? "").toLowerCase() === "true";

type AppMode = "idle" | "typing" | "recording" | "review";

const EnhancedDashboardScreen: React.FC = () => {
  const router = useRouter();
  const { profile } = useUser();

  // Main state
  const [mode, setMode] = useState<AppMode>("idle");
  const [dreamText, setDreamText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [timer, setTimer] = useState("0:00");
  const [recordingStatus, setRecordingStatus] = useState(
    "Ready to record your dream!"
  );

  // Refs
  const inputRef = useRef<TextInput>(null);
  const t0 = useRef<number>(0);
  const tick = useRef<number | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Greeting logic
  const now = new Date();
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  // Request mic permissions
  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  // Animation helpers
  const startRecordingAnimation = () => {
    // Pulsing red glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Breathing scale effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow intensity
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopRecordingAnimation = () => {
    pulseAnim.stopAnimation();
    scaleAnim.stopAnimation();
    glowAnim.stopAnimation();

    pulseAnim.setValue(0);
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
  };

  // Recording functions
  const ensureMicPermission = async () => {
    const { status } = await Audio.getPermissionsAsync();
    if (status !== "granted") {
      const res = await Audio.requestPermissionsAsync();
      if (res.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "DreamToon needs microphone access to record your dream 🙏"
        );
        return false;
      }
    }
    return true;
  };

  const startRecording = async () => {
    if (!(await ensureMicPermission())) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setMode("recording");
      setRecordingStatus("🎙️ Recording your dream...");
      t0.current = Date.now();

      // Start timer
      tick.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0.current) / 1000);
        setTimer(
          `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
        );
      }, 500);

      startRecordingAnimation();
    } catch (e) {
      if (DEBUG) console.error(e);
      setRecordingStatus(`Recording error: ${(e as Error).message}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (tick.current) {
        clearInterval(tick.current);
        tick.current = null;
      }

      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setMode("review");
      setRecordingStatus("✅ Recording saved! Ready to create your comic.");

      stopRecordingAnimation();
    } catch (e) {
      if (DEBUG) console.error(e);
      setRecordingStatus(`Stop error: ${(e as Error).message}`);
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    }

    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }

    stopRecordingAnimation();
    resetToIdle();
  };

  const resetToIdle = () => {
    setMode("idle");
    setTimer("0:00");
    setRecordingStatus("Ready to record your dream!");
    setRecordingUri(null);
    setDreamText("");
  };

  // Navigation handlers
  const openTyping = () => {
    if (mode === "idle") {
      setMode("typing");
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  };

  const handleBack = () => {
    if (mode === "typing") {
      setMode("idle");
      setDreamText("");
      Keyboard.dismiss();
    } else if (mode === "recording") {
      cancelRecording();
    } else if (mode === "review") {
      resetToIdle();
    }
  };

  const goto = (route: string) => {
    if (mode !== "idle") return; // Prevent navigation during recording/review

    if (route === "library") router.push("/(tab)/TimelineScreen");
    else if (route === "settings") router.push("/(tab)/SettingScreen");
  };

  // Upload handlers
  const handleUploadText = async () => {
    if (!dreamText.trim() || isLoading) return;

    setIsLoading(true);
    Keyboard.dismiss();
    router.push("/(tab)/ProcessingScreen");

    try {
      const { data, error } = await supabase.functions.invoke("process_dream", {
        body: { text: dreamText.trim() },
      });

      if (error) throw error;

      router.push({
        pathname: "/(tab)/ComicResultScreen",
        params: { urls: JSON.stringify(data.urls) },
      });
    } catch (e) {
      console.error("Failed to process dream:", e);
      Alert.alert("Error", "Could not create your comic. Please try again.");
      router.back();
    } finally {
      setIsLoading(false);
      resetToIdle();
    }
  };

  const handleUploadRecording = async () => {
    if (!recordingUri || isLoading) return;

    setIsLoading(true);
    setRecordingStatus("Uploading your dream...");
    router.push("/(tab)/ProcessingScreen");

    try {
      const form = new FormData();
      form.append("audio", {
        uri: recordingUri,
        name: "dream.m4a",
        type: "audio/m4a",
      } as any);

      const { data, error } = await supabase.functions.invoke("process_dream", {
        body: form,
      });

      if (error) throw error;

      if (!data || !data.urls) {
        throw new Error("No comic URLs received from server");
      }

      router.push({
        pathname: "/(tab)/ComicResultScreen",
        params: { urls: JSON.stringify(data.urls) },
      });
    } catch (e) {
      if (DEBUG) console.error("Upload error:", e);
      Alert.alert("Upload failed", `Error: ${String(e)}`);
      router.back();
    } finally {
      setIsLoading(false);
      resetToIdle();
    }
  };

  // Render enhanced record button
  const renderRecordButton = () => {
    const isRecording = mode === "recording";
    const isReview = mode === "review";

    return (
      <View
        style={[
          styles.recordButtonContainer,
          isIPad && styles.recordButtonContainerTablet,
        ]}
      >
        <Animated.View
          style={[
            styles.recordButtonWrapper,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable
            disabled={isReview}
            onPress={isRecording ? stopRecording : startRecording}
            style={styles.recordButtonPressable}
          >
            {/* Animated glow effect */}
            <Animated.View
              style={[
                styles.glowEffect,
                isIPad && styles.glowEffectTablet,
                {
                  opacity: isRecording ? glowAnim : 0,
                  shadowColor: isRecording ? "#FF4E4E" : "#F021B2",
                },
              ]}
            />

            {/* Outer ring */}
            <LinearGradient
              colors={
                isRecording
                  ? ["rgba(255,78,78,0.3)", "rgba(255,100,100,0.3)"]
                  : ["rgba(200, 121, 255, 0.01)", "rgba(240, 33, 178, 0.01)"]
              }
              style={[styles.outerRing, isIPad && styles.outerRingTablet]}
            >
              {/* Inner ring */}
              <LinearGradient
                colors={
                  isRecording
                    ? ["rgba(255,78,78,0.8)", "rgba(255,100,100,0.8)"]
                    : ["rgba(240, 33, 178, 0.03)", "rgba(240, 33, 178, 0.01)"]
                }
                style={[styles.innerRing, isIPad && styles.innerRingTablet]}
              >
                <View style={styles.recordButtonContent}>
                  <Text style={[styles.timer, isIPad && styles.timerTablet]}>
                    {timer}
                  </Text>
                  <Text
                    style={[
                      styles.recordHint,
                      isIPad && styles.recordHintTablet,
                    ]}
                  >
                    {isRecording ? "Tap to Stop" : "Tap to Record"}
                  </Text>
                </View>
              </LinearGradient>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  return (
    <Background source={require("../../assets/images/stars.png")}>
      <LinearGradient colors={["#230B3D", "#12081C"]} style={styles.container}>
        {/* Recording overlay */}
        {mode === "recording" && (
          <Animated.View
            style={[
              styles.recordingOverlay,
              {
                opacity: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 0.2],
                }),
              },
            ]}
          />
        )}

        {/* Header button */}
        <Pressable
          style={[styles.headerBtn, isIPad && styles.headerBtnTablet]}
          onPress={mode === "idle" ? () => goto("settings") : handleBack}
        >
          <Ionicons
            name={mode === "idle" ? "settings" : "close"}
            size={getResponsiveValue(20, 28)}
            color="#FFFFFF"
          />
        </Pressable>

        {/* Greeting */}
        <View
          style={[
            styles.greetingWrapper,
            isIPad && styles.greetingWrapperTablet,
          ]}
        >
          <Text
            style={[styles.greetingText, isIPad && styles.greetingTextTablet]}
          >
            {greeting},
          </Text>
          <Text
            style={[
              styles.greetingNameText,
              isIPad && styles.greetingNameTextTablet,
            ]}
          >
            {profile?.name ?? "Dreamer"}
          </Text>
        </View>

        {/* Status text for recording states */}
        {(mode === "recording" || mode === "review") && (
          <Text style={[styles.statusText, isIPad && styles.statusTextTablet]}>
            {recordingStatus}
          </Text>
        )}

        {/* Main content area */}
        <View style={styles.middleWrapper}>
          {mode === "idle" && (
            <>
              {renderRecordButton()}
              <Pressable onPress={openTyping} style={styles.typeInsteadWrapper}>
                <Text
                  style={[
                    styles.typeInstead,
                    isIPad && styles.typeInsteadTablet,
                  ]}
                >
                  Want to type instead?
                </Text>
              </Pressable>
            </>
          )}

          {mode === "typing" && (
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
          )}

          {mode === "recording" && renderRecordButton()}

          {mode === "review" && (
            <View style={styles.reviewWrapper}>
              {renderRecordButton()}
              <View style={styles.reviewActions}>
                <ShinyGradientButton onPress={handleUploadRecording}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    "Create Comic"
                  )}
                </ShinyGradientButton>
                <ShinyGradientButton onPress={() => resetToIdle()}>
                  Record Again
                </ShinyGradientButton>
              </View>
            </View>
          )}
        </View>

        {/* Navigation bar - only show in idle mode */}
        {mode === "idle" && (
          <View style={[styles.navBar, isIPad && styles.navBarTablet]}>
            <Pressable style={styles.navBtn} onPress={() => goto("home")}>
              <Ionicons
                name="home"
                size={getResponsiveValue(24, 32)}
                color="#FFFFFF"
              />
            </Pressable>
            <Pressable style={styles.navBtn} onPress={() => goto("library")}>
              <Ionicons
                name="book"
                size={getResponsiveValue(24, 32)}
                color="#C879FF"
              />
            </Pressable>
          </View>
        )}
      </LinearGradient>
    </Background>
  );
};

export default EnhancedDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, alignItems: "center" },

  // Recording overlay
  recordingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,50,50,0.3)",
    zIndex: 0,
  },

  // Header
  headerBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
  },
  headerBtnTablet: {
    top: 80,
    left: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  // Greeting
  greetingWrapper: { marginTop: 60, alignItems: "center" },
  greetingWrapperTablet: { marginTop: 80 },
  greetingText: {
    fontSize: 40,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 46,
  },
  greetingTextTablet: {
    fontSize: 56,
    lineHeight: 64,
  },

  greetingNameText: {
    fontSize: 40,
    color: "#C879FF", // Bright Lavender
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 46,
  },
  greetingNameTextTablet: {
    fontSize: 56,
    lineHeight: 64,
  },

  // Status text
  statusText: {
    color: "#D1A8C5",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  statusTextTablet: {
    fontSize: 20,
    marginTop: 30,
    marginBottom: 30,
  },

  // Main content
  middleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  // Enhanced record button
  recordButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  recordButtonContainerTablet: {
    marginBottom: 30,
  },
  recordButtonWrapper: {
    shadowColor: "#F021B2",
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  recordButtonPressable: {
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 180,
    shadowOpacity: 0.8,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
  },
  glowEffectTablet: {
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 270,
    shadowRadius: 70,
  },
  outerRing: {
    width: 320,
    height: 320,
    borderRadius: 160,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(240, 33, 178, 0.4)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  outerRingTablet: {
    width: 480,
    height: 480,
    borderRadius: 240,
    borderWidth: 4,
  },
  innerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F021B2",
  },
  innerRingTablet: {
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 3,
  },
  recordButtonContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    color: "#FFFFFF",
    fontSize: 42,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
    marginBottom: 4,
  },
  timerTablet: {
    fontSize: 60,
    marginBottom: 8,
  },
  recordHint: {
    color: "#D1A8C5",
    fontSize: 16,
    textAlign: "center",
  },
  recordHintTablet: {
    fontSize: 20,
  },

  // Typing mode
  typeInsteadWrapper: { marginTop: 10 },
  typeInstead: {
    color: "#D1A8C5",
    fontSize: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  typeInsteadTablet: {
    fontSize: 20,
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
  },
  inputTablet: {
    height: 300,
    borderRadius: 24,
    padding: 20,
    fontSize: 18,
    marginBottom: 20,
  },
  charCount: {
    color: "#D1A8C5",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  charCountTablet: {
    fontSize: 16,
    marginBottom: 20,
  },

  // Review mode
  reviewWrapper: {
    alignItems: "center",
    width: "100%",
  },
  reviewActions: {
    width: "90%",
    maxWidth: 350,
    gap: 20,
    marginTop: 30,
  },

  // Navigation
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
  navBarTablet: {
    width: "80%",
    height: 90,
    borderRadius: 45,
    marginBottom: 40,
  },
  navBtn: { padding: 8, borderRadius: 12 },
});
