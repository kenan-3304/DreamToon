import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  Alert, // NEW: Import Alert for error feedback
  ActivityIndicator, // NEW: Import for loading state
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../utils/supabase"; // NEW: Import the Supabase client
import { useRouter } from "expo-router";

// iPad detection
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

// DELETED: Firebase-related imports are no longer needed.

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const { profile } = useUser();
  const [isTyping, setIsTyping] = useState(false);
  const [dreamText, setDreamText] = useState("");
  const [isLoading, setIsLoading] = useState(false); // NEW: State to handle loading
  const inputRef = useRef<TextInput>(null);

  // The greeting logic from your original file is unchanged
  const now = new Date();
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  // --- Handlers from your original file, with handleUpload being modified ---
  const goRecord = () => router.push("/(tab)/RecordScreen");
  const openTyping = () => {
    setIsTyping(true);
    setTimeout(() => inputRef.current?.focus(), 350);
  };
  const handleBack = () => {
    setIsTyping(false);
    setDreamText("");
    Keyboard.dismiss();
  };
  const goto = (route: string) => {
    if (route === "library") router.push("/(tab)/TimelineScreen");
    else if (route === "settings") router.push("/(tab)/SettingScreen");
  };

  // MODIFIED: This function now securely calls the Edge Function
  const handleUpload = async () => {
    if (!dreamText.trim() || isLoading) return;

    setIsLoading(true);
    Keyboard.dismiss();

    // Navigate to the processing screen immediately for a good UX
    router.push("/(tab)/ProcessingScreen");

    try {
      // Send as JSON object instead of FormData
      const { data, error } = await supabase.functions.invoke("process_dream", {
        body: { text: dreamText.trim() },
      });

      if (error) throw error;

      // When the function is done, navigate to the result screen with the URLs
      router.push({
        pathname: "/(tab)/ComicResultScreen",
        params: { urls: JSON.stringify(data.urls) },
      });
    } catch (e) {
      console.error("Failed to process dream:", e);
      Alert.alert("Error", "Could not create your comic. Please try again.");
      // If it fails, navigate back to the dashboard from the processing screen
      router.back();
    } finally {
      setIsLoading(false);
      setDreamText("");
      setIsTyping(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
      {/* settings/back button logic is unchanged */}
      {!isTyping ? (
        <Pressable
          style={[styles.settingsBtn, isIPad && styles.settingsBtnTablet]}
          onPress={() => goto("settings")}
        >
          <Ionicons
            name="settings"
            size={getResponsiveValue(20, 28)}
            color="#FFFFFF"
          />
        </Pressable>
      ) : (
        <Pressable
          style={[styles.settingsBtn, isIPad && styles.settingsBtnTablet]}
          onPress={handleBack}
        >
          <Ionicons
            name="close"
            size={getResponsiveValue(20, 28)}
            color="#FFFFFF"
          />
        </Pressable>
      )}

      {/* greeting is unchanged */}
      <View
        style={[styles.greetingWrapper, isIPad && styles.greetingWrapperTablet]}
      >
        <Text
          style={[styles.greetingText, isIPad && styles.greetingTextTablet]}
        >
          {greeting},
        </Text>
        <Text
          style={[styles.greetingText, isIPad && styles.greetingTextTablet]}
        >
          {profile?.name ?? "Dreamer"}
        </Text>{" "}
      </View>

      <View style={styles.middleWrapper}>
        {!isTyping ? (
          <>
            <Pressable
              onPress={goRecord}
              style={[styles.cloudWrapper, isIPad && styles.cloudWrapperTablet]}
            >
              <LinearGradient
                colors={["#00EAFF", "#6633EE", "#FF4EE0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.cloudGradient,
                  isIPad && styles.cloudGradientTablet,
                ]}
              >
                <Text
                  style={[styles.cloudText, isIPad && styles.cloudTextTablet]}
                >
                  Tap to Record
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={openTyping} style={styles.typeInsteadWrapper}>
              <Text
                style={[styles.typeInstead, isIPad && styles.typeInsteadTablet]}
              >
                Want to type instead?
              </Text>
            </Pressable>
          </>
        ) : (
          <View
            style={[styles.inputWrapper, isIPad && styles.inputWrapperTablet]}
          >
            <TextInput
              ref={inputRef}
              value={dreamText}
              onChangeText={setDreamText}
              placeholder="Describe your dream…"
              placeholderTextColor="#a7a7a7"
              multiline
              maxLength={2000}
              style={[styles.input, isIPad && styles.inputTablet]}
            />
            <Text style={[styles.charCount, isIPad && styles.charCountTablet]}>
              {dreamText.length}/2000
            </Text>
            <ShinyGradientButton onPress={handleUpload}>
              {/* MODIFIED: Show loading state */}
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "Create Comic"
              )}
            </ShinyGradientButton>
          </View>
        )}
      </View>

      {/* nav bar is unchanged */}
      {!isTyping && (
        <View style={[styles.navBar, isIPad && styles.navBarTablet]}>
          <Pressable style={styles.navBtn} onPress={() => goto("home")}>
            <Ionicons
              name="home"
              size={getResponsiveValue(24, 32)}
              color="#00EAFF"
            />
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => goto("library")}>
            <Ionicons
              name="book"
              size={getResponsiveValue(24, 32)}
              color="#a7a7a7"
            />
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
};

export default DashboardScreen;

// Styles are unchanged
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
  settingsBtnTablet: {
    top: 80,
    left: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
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
  middleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  cloudWrapper: {
    shadowColor: "#00EAFF",
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 20,
  },
  cloudWrapperTablet: {
    shadowRadius: 40,
    marginBottom: 30,
  },
  cloudGradient: {
    width: 320,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  cloudGradientTablet: {
    width: 480,
    height: 240,
    borderRadius: 120,
  },
  cloudText: { color: "#FFFFFF", fontSize: 22, fontWeight: "600" },
  cloudTextTablet: { fontSize: 32 },
  typeInsteadWrapper: { marginTop: 10 },
  typeInstead: {
    color: "#a7a7a7",
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
    borderColor: "rgba(0,234,255,0.3)",
    backgroundColor: "rgba(13,10,60,0.9)",
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
  navBarTablet: {
    width: "80%",
    height: 90,
    borderRadius: 45,
    marginBottom: 40,
  },
  navBtn: { padding: 8, borderRadius: 12 },
  charCount: {
    color: "#a7a7a7",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  charCountTablet: {
    fontSize: 16,
    marginBottom: 20,
  },
});
