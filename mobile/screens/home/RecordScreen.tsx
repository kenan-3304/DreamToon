import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { RootStackParamList } from "../../App";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PROCESS_DREAM_URL } from "../../config";

/*───────────────────────────────────────────────
  HEADER
───────────────────────────────────────────────*/
const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();
  return (
    <View style={styles.headerRow}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
        <ChevronLeft size={20} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerText}>{`${greeting},\nKenan`}</Text>
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
    <ShinyGradientButton variant="outline" onPress={onRetry}>
      Record Again
    </ShinyGradientButton>
  </View>
);

/*───────────────────────────────────────────────
  MAIN SCREEN (logic unchanged)
───────────────────────────────────────────────*/
export default function RecordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [mode, setMode] = useState<"idle" | "recording" | "review">("idle");
  const [status, setStatus] = useState("Ready to record your dream!");
  const [uri, setUri] = useState<string | null>(null);
  const [timer, setTimer] = useState("0:00");
  const t0 = useRef<number>(0);
  const tick = useRef<NodeJS.Timeout | null>(null);

  // mic perms
  useEffect(() => {
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) Alert.alert("Microphone permission denied");
    })();
    return () => tick.current && clearInterval(tick.current);
  }, []);

  /* helpers */
  const start = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      setMode("recording");
      setStatus("⏺️ Recording…");
      t0.current = Date.now();
      tick.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0.current) / 1000);
        setTimer(
          `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
        );
      }, 500);
    } catch (e) {
      console.error(e);
      setStatus(`Start error: ${(e as Error).message}`);
    }
  };

  const stop = async () => {
    try {
      tick.current && clearInterval(tick.current);
      await audioRecorder.stop();
      setUri(audioRecorder.uri);
      setMode("review");
      setStatus("✅ Saved locally. Ready to upload!");
    } catch (e) {
      console.error(e);
      setStatus(`Stop error: ${(e as Error).message}`);
    }
  };

  const reset = () => {
    tick.current && clearInterval(tick.current);
    audioRecorder.stopAsync?.();
    setUri(null);
    setTimer("0:00");
    setStatus("Ready to record your dream!");
    setMode("idle");
  };
  const back = () => {
    reset();
    navigation.goBack();
  };
  const upload = async () => {
    if (!uri) return;
    try {
      setStatus("Uploading…");
      const form = new FormData();
      form.append("audio", {
        uri,
        name: "dream.m4a",
        type: "audio/m4a",
      } as any);
      form.append("user_id", "00000000-0000-0000-0000-000000000000");

      const res = await fetch(PROCESS_DREAM_URL, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const { urls } = await res.json();
      navigation.navigate("ComicResult", { urls });
    } catch (e) {
      console.error(e);
      Alert.alert("Upload failed", String(e));
      setStatus("Upload failed");
    }
  };

  //fetch

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000"]}
      style={styles.container}
    >
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 100,
    paddingBottom: 60,
  },
  /* header */
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    fontSize: 36,
    color: "#FFF",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 46,
  },
  /* status */
  statusText: {
    color: "#a7a7a7",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  /* button rings */
  circleWrapper: {
    shadowColor: "#00EAFF",
    shadowOpacity: 0.75,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 20,
  },
  outerRing: {
    width: 310,
    height: 310,
    borderRadius: 155,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#00EAFF",
  },
  innerRing: {
    width: 195,
    height: 195,
    borderRadius: 97.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 3,
    borderColor: "#00EAFF",
  },
  timer: {
    color: "#FFF",
    fontSize: 42,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  hint: { color: "#a7a7a7", fontSize: 15, marginTop: 4 },
  /* review */
  reviewRow: { width: "90%", gap: 20 },
});
