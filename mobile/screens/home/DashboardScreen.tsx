import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Home, Book, Settings, X } from "lucide-react-native";

// reuse gradient button from WelcomeScreen (move to components/ later)
import { ShinyGradientButton } from "../../components/ShinyGradientButton";

import { PROCESS_DREAM_URL } from "../../config";
import { useUser } from "../../UserContext";

const DEBUG = (process.env.DEBUG ?? "").toLowerCase() === "true";

const DashboardScreen: React.FC = () => {
  const nav = useNavigation();
  const { profile } = useUser();
  const [isTyping, setIsTyping] = useState(false);
  const [dreamText, setDreamText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const now = new Date();
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  // ───────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────
  const goRecord = () => nav.navigate("Record" as never);
  const openTyping = () => {
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 350);
  };
  const handleDone = () => {
    if (dreamText.trim()) {
      if (DEBUG) console.log("Dream text:", dreamText);
      // TODO: persist / navigate
    }
    setIsTyping(false);
    setDreamText("");
    Keyboard.dismiss();
  };

  const handleBack = () => {
    setIsTyping(false);
    setDreamText("");
    Keyboard.dismiss();
  };

  const goto = (route: string) => {
    if (route === "library") nav.navigate("Timeline" as never);
    else if (route === "settings") nav.navigate("Settings" as never);
  };

  const handleUpload = async () => {
    if (!dreamText.trim()) return; // Prevent empty uploads

    // Navigate to ProcessingScreen and pass the dreamText as a param
    nav.navigate("Processing" as never, { dreamText } as never);

    // Optionally, clear the input and exit typing mode
    setIsTyping(false);
    setDreamText("");
    Keyboard.dismiss();
  };

  // ───────────────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
      {/* settings/back button */}
      {!isTyping ? (
        <Pressable style={styles.settingsBtn} onPress={() => goto("settings")}>
          <Settings size={20} color="#FFFFFF" />
        </Pressable>
      ) : (
        <Pressable style={styles.settingsBtn} onPress={handleBack}>
          <X size={20} color="#FFFFFF" />
        </Pressable>
      )}

      {/* greeting */}
      <View style={styles.greetingWrapper}>
        <Text style={styles.greetingText}>{greeting},</Text>
        <Text style={styles.greetingText}>{profile?.name}</Text>
      </View>

      {/* main area */}
      <View style={styles.middleWrapper}>
        {!isTyping ? (
          <>
            <Pressable onPress={goRecord} style={styles.cloudWrapper}>
              <LinearGradient
                colors={["#00EAFF", "#6633EE", "#FF4EE0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cloudGradient}
              >
                <Text style={styles.cloudText}>Tap to Record</Text>
              </LinearGradient>
            </Pressable>

            {/* type instead */}
            <Pressable onPress={openTyping} style={styles.typeInsteadWrapper}>
              <Text style={styles.typeInstead}>Want to type instead?</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              value={dreamText}
              onChangeText={setDreamText}
              placeholder="Describe your dream…"
              placeholderTextColor="#a7a7a7"
              multiline
              maxLength={2000}
              style={styles.input}
            />
            <Text style={styles.charCount}>{dreamText.length}/2000</Text>
            <ShinyGradientButton
              onPress={handleUpload}
              disabled={!dreamText.trim()}
            >
              Upload
            </ShinyGradientButton>
          </View>
        )}
      </View>

      {/* nav bar */}
      {!isTyping && (
        <View style={styles.navBar}>
          <Pressable style={styles.navBtn} onPress={() => goto("home")}>
            <Home size={24} color="#00EAFF" />
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => goto("library")}>
            <Book size={24} color="#a7a7a7" />
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
};

export default DashboardScreen;

// ───────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, alignItems: "center" },
  settingsBtn: {
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
  },
  greetingWrapper: { marginTop: 60, alignItems: "center" },
  greetingText: {
    fontSize: 40,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 46,
  },
  middleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  // cloud button
  cloudWrapper: {
    shadowColor: "#00EAFF",
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 20,
  },
  cloudGradient: {
    width: 320,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  cloudText: { color: "#FFFFFF", fontSize: 22, fontWeight: "600" },
  // type instead
  typeInsteadWrapper: { marginTop: 10 },
  typeInstead: {
    color: "#a7a7a7",
    fontSize: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  // typing input
  inputWrapper: { width: "90%", maxWidth: 350 },
  input: {
    height: 200,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.3)",
    backgroundColor: "rgba(13,10,60,0.9)",
    color: "#FFFFFF",
    padding: 16,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  // nav
  navBar: {
    width: "90%",
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(13,10,60,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  navBtn: { padding: 8, borderRadius: 12 },
  charCount: {
    color: "#a7a7a7",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
});
