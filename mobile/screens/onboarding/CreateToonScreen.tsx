import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Camera, ChevronDown } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

import { ShinyGradientButton } from "../../components/ShinyGradientButton";

// ────────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────────
const skinTones = [
  "#F7D7C4",
  "#F4C2A1",
  "#E8B887",
  "#D4A574",
  "#C19660",
  "#8B6F47",
] as const;
const ages = Array.from({ length: 89 }, (_, i) => String(i + 12));
const genders = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to disclose",
] as const;
const hairTypes = ["Straight", "Wavy", "Curly", "Coily", "Bald"] as const;
const hairColors = [
  "Black",
  "Brown",
  "Blonde",
  "Red",
  "Gray",
  "White",
  "Auburn",
  "Other",
] as const;

const CreateToonScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState<"upload" | "describe">("upload");
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    age: "",
    gender: "",
    hairType: "",
    hairColor: "",
    skinTone: skinTones[1],
  });

  // helpers
  const updateForm = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));
  const launchCamera = async () => {
    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!r.canceled) setUploadedUri(r.assets[0].uri);
  };
  const launchLibrary = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!r.canceled) setUploadedUri(r.assets[0].uri);
  };
  const formValid = form.age && form.gender && form.hairType && form.hairColor;
  const canContinue =
    (tab === "upload" && uploadedUri) || (tab === "describe" && formValid);
  const continueNext = () =>
    canContinue && navigation.navigate("Dashboard" as never);

  const renderPicker = (
    selected: string,
    onChange: (v: string) => void,
    items: readonly string[],
    placeholder: string
  ) => (
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selected}
        onValueChange={(v) => onChange(String(v))}
        style={styles.picker}
        dropdownIconColor="#FFFFFF"
        mode="dropdown"
      >
        <Picker.Item label={placeholder} value="" color="#a7a7a7" />
        {items.map((v) => (
          <Picker.Item key={v} label={v} value={v} />
        ))}
      </Picker>
      <ChevronDown
        size={18}
        color="#FFFFFF"
        style={styles.pickerChevron}
        pointerEvents="none"
      />
    </View>
  );

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
      {/* Progress */}
      <View style={styles.progressWrapper}>
        {[0, 1, 2].map((i) => (
          <LinearGradient
            key={i}
            colors={["#00EAFF", "#FF4EE0"]}
            style={styles.progressBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        ))}
      </View>
      <Text style={styles.progressLabel}>Step 3 of 3</Text>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Create Your Toon</Text>
        <Text style={styles.subHeading}>Upload a selfie</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("upload")}
            style={[
              styles.tabTrigger,
              tab === "upload" && styles.tabTriggerActive,
            ]}
          >
            <Text style={styles.tabText}>Upload Selfie</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("describe")}
            style={[
              styles.tabTrigger,
              tab === "describe" && styles.tabTriggerActive,
            ]}
          >
            <Text style={styles.tabText}>Describe Yourself</Text>
          </Pressable>
        </View>

        {tab === "upload" ? (
          <>
            <Pressable style={styles.uploadBox} onPress={launchLibrary}>
              {uploadedUri ? (
                <Image
                  source={{ uri: uploadedUri }}
                  style={styles.uploadedImg}
                />
              ) : (
                <Camera color="#00EAFF" size={46} />
              )}
            </Pressable>
            <View style={{ width: "100%", marginTop: 32, gap: 16 }}>
              <ShinyGradientButton onPress={launchCamera}>
                📸 Take Photo
              </ShinyGradientButton>
              <Pressable onPress={launchLibrary} style={styles.outlineBtn}>
                <Text style={styles.outlineText}>🖼️ Choose from Gallery</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ width: "100%", marginTop: 20, gap: 24 }}>
            <View>
              <Text style={styles.label}>Age</Text>
              {renderPicker(
                form.age,
                (v) => updateForm("age", v),
                ages,
                "Select age"
              )}
            </View>
            <View>
              <Text style={styles.label}>Gender</Text>
              {renderPicker(
                form.gender,
                (v) => updateForm("gender", v),
                genders,
                "Select gender"
              )}
            </View>
            <View>
              <Text style={styles.label}>Hair Type</Text>
              {renderPicker(
                form.hairType,
                (v) => updateForm("hairType", v),
                hairTypes,
                "Select type"
              )}
            </View>
            <View>
              <Text style={styles.label}>Hair Color</Text>
              {renderPicker(
                form.hairColor,
                (v) => updateForm("hairColor", v),
                hairColors,
                "Select color"
              )}
            </View>
            <View>
              <Text style={styles.label}>Skin Tone</Text>
              <View style={styles.toneRow}>
                {skinTones.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => updateForm("skinTone", t)}
                    style={[
                      styles.toneSwatch,
                      { backgroundColor: t },
                      form.skinTone === t && styles.toneSwatchActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ width: "90%", marginBottom: 24 }}>
        <ShinyGradientButton onPress={continueNext} disabled={!canContinue}>
          Continue
        </ShinyGradientButton>
        <Pressable
          onPress={() => navigation.navigate("Dashboard" as never)}
          style={{ marginTop: 12 }}
        >
          <Text style={styles.skipText}>skip</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
};

export default CreateToonScreen;

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  progressWrapper: {
    flexDirection: "row",
    gap: 8,
    width: "80%",
    alignSelf: "center",
    marginTop: 40,
  },
  progressBar: { flex: 1, height: 6, borderRadius: 3 },
  progressLabel: { textAlign: "center", color: "#8B8B8B", marginTop: 8 },
  scrollBody: { alignItems: "center", paddingHorizontal: 32 },
  heading: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 20,
    textAlign: "center",
  },
  subHeading: {
    color: "#a7a7a7",
    fontSize: 18,
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },
  // Tabs
  tabRow: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  tabTrigger: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  tabTriggerActive: { backgroundColor: "rgba(0,234,255,0.18)" },
  tabText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
  // Upload
  uploadBox: {
    width: 280,
    height: 200,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(0,234,255,0.6)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,234,255,0.05)",
  },
  uploadedImg: { width: "100%", height: "100%", borderRadius: 14 },
  outlineBtn: {
    height: 55,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  outlineText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  // Pickers
  label: { color: "#FFFFFF", fontSize: 14, marginBottom: 6 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    position: "relative",
    height: Platform.OS === "ios" ? 200 : 48,
    ...Platform.select({ android: { overflow: "hidden" } }),
  },
  picker: {
    color: "#FFFFFF",
    height: Platform.OS === "ios" ? 200 : 48,
    width: "100%",
  },
  pickerChevron: {
    position: "absolute",
    right: 12,
    top: Platform.OS === "ios" ? 90 : 14,
  },
  // Skin tones
  toneRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  toneSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  toneSwatchActive: { transform: [{ scale: 1.1 }], borderColor: "#FFFFFF" },
  // Misc
  skipText: { color: "#a7a7a7", fontSize: 16, textAlign: "center" },
});
