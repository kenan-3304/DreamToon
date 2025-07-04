import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../context/UserContext";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { supabase } from "../../utils/supabase";

const DEBUG = (process.env.DEBUG ?? "").toLowerCase() === "true";

/*───────────────────────────────────────────────
  HEADER
───────────────────────────────────────────────*/
const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { profile } = useUser();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();
  return (
    <View style={styles.headerRow}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerText}>{`${greeting},\n${
        profile?.name ?? ""
      }`}</Text>
    </View>
  );
};

const StatusText: React.FC<{ txt: string }> = ({ txt }) => (
  <Text style={styles.statusText}>{txt}</Text>
);

/*───────────────────────────────────────────────
  STATIC TWO-RING RECORD BUTTON (no animations)
───────────────────────────────────────────────*/
const RecordButton: React.FC<{
  mode: "idle" | "recording" | "review";
  timer: string;
  onStart: () => void;
  onStop: () => void;
}> = ({ mode, timer, onStart, onStop }) => {
  const isIdle = mode === "idle";
  const isRec = mode === "recording";

  return (
    <View style={styles.circleWrapper}>
      <Pressable
        disabled={mode === "review"}
        onPress={isIdle ? onStart : isRec ? onStop : undefined}
      >
        {/* OUTER translucent ring */}
        <LinearGradient
          colors={
            isRec
              ? ["rgba(255,78,224,0.18)", "rgba(255,100,100,0.18)"]
              : ["rgba(0,234,255,0.12)", "rgba(102,51,238,0.12)"]
          }
          style={styles.outerRing}
        >
          {/* INNER ring */}
          <View style={styles.innerRing}>
            <Text style={styles.timer}>{timer}</Text>
            {isIdle && <Text style={styles.hint}>Tap to Record</Text>}
            {isRec && <Text style={styles.hint}>Tap to Stop</Text>}
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const ReviewActions: React.FC<{
  onUpload: () => void;
  onRetry: () => void;
}> = ({ onUpload, onRetry }) => (
  <View style={styles.reviewRow}>
    <ShinyGradientButton onPress={onUpload}>Upload Dream</ShinyGradientButton>
    <ShinyGradientButton onPress={onRetry}>Record Again</ShinyGradientButton>
  </View>
);

/*───────────────────────────────────────────────
  MAIN SCREEN (logic unchanged)
───────────────────────────────────────────────*/
export default function RecordScreen() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [mode, setMode] = useState<"idle" | "recording" | "review">("idle");
  const [status, setStatus] = useState("Ready to record your dream!");
  const [uri, setUri] = useState<string | null>(null);
  const [timer, setTimer] = useState("0:00");
  const t0 = useRef<number>(0);
  const tick = useRef<number | null>(null);

  // Pulsing animation for recording
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Defensive permission helper
  const ensureMicPerm = async () => {
    const { status } = await Audio.getPermissionsAsync();
    if (status !== "granted") {
      const res = await Audio.requestPermissionsAsync();
      if (res.status !== "granted") {
        Alert.alert("DreamToon needs the mic to record your dream 🙏");
        router.back();
        return false;
      }
    }
    return true;
  };

  // mic perms
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") Alert.alert("Microphone permission denied");
    })();
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  /* helpers */
  const start = async () => {
    if (!(await ensureMicPerm())) return;

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
      setStatus("⏺️ Recording…");
      t0.current = Date.now();
      tick.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0.current) / 1000);
        setTimer(
          `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
        );
      }, 500);

      // Start pulsing animation
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
    } catch (e) {
      if (DEBUG) console.error(e);
      setStatus(`Start error: ${(e as Error).message}`);
    }
  };

  const stop = async () => {
    try {
      tick.current && clearInterval(tick.current);

      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setUri(uri);
      setRecording(null);
      setMode("review");
      setStatus("✅ Saved locally. Ready to upload!");

      // Stop pulsing animation
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    } catch (e) {
      if (DEBUG) console.error(e);
      setStatus(`Stop error: ${(e as Error).message}`);
    }
  };

  const reset = () => {
    tick.current && clearInterval(tick.current);
    setUri(null);
    setTimer("0:00");
    setStatus("Ready to record your dream!");
    setMode("idle");

    // Stop pulsing animation
    pulseAnim.stopAnimation();
    pulseAnim.setValue(0);
  };

  const back = () => {
    reset();
    router.back();
  };

  const upload = async () => {
    if (!uri) return;
    try {
      setStatus("Uploading…");

      // Navigate to processing screen immediately for better UX
      router.push("/(tab)/ProcessingScreen");

      const form = new FormData();
      form.append("audio", {
        uri,
        name: "dream.m4a",
        type: "audio/m4a",
      } as any);

      const { data, error } = await supabase.functions.invoke("process_dream", {
        body: form,
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }

      if (!data || !data.urls) {
        throw new Error("No comic URLs received from server");
      }

      // Navigate to the result screen, passing the URLs as params
      router.push({
        pathname: "/(tab)/ComicResultScreen",
        params: { urls: JSON.stringify(data.urls) },
      });
    } catch (e) {
      if (DEBUG) console.error("Upload error details:", e);
      Alert.alert("Upload failed", `Error: ${String(e)}`);
      setStatus("Upload failed");
      // Navigate back from processing screen if there's an error
      router.back();
    }
  };

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000"]}
      style={styles.container}
    >
      {/* Red overlay when recording */}
      {mode === "recording" && (
        <Animated.View
          style={[
            styles.redOverlay,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.25],
              }),
            },
          ]}
        />
      )}

      <Header onBack={back} />
      <StatusText txt={status} />
      <RecordButton mode={mode} timer={timer} onStart={start} onStop={stop} />
      {mode === "review" && <ReviewActions onUpload={upload} onRetry={reset} />}
    </LinearGradient>
  );
}

/*───────────────────────────────────────────────
  STYLES
───────────────────────────────────────────────*/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  /* header */
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 0,
    top: -10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    zIndex: 1,
  },
  headerText: {
    width: "100%",
    fontSize: 36,
    color: "#FFF",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 46,
    marginTop: 10,
  },
  /* status */
  statusText: {
    color: "#a7a7a7",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 60,
  },
  /* button rings */
  circleWrapper: {
    shadowColor: "#00EAFF",
    shadowOpacity: 0.75,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    alignSelf: "center",
    marginBottom: 20,
  },
  outerRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#00EAFF",
  },
  innerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 3,
    borderColor: "#00EAFF",
  },
  timer: {
    color: "#FFF",
    fontSize: 38,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  hint: { color: "#a7a7a7", fontSize: 15, marginTop: 4 },
  /* review */
  reviewRow: {
    width: "100%",
    gap: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  redOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,50,50,0.3)",
    zIndex: 0,
  },
});
