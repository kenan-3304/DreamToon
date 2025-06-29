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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ShinyGradientButton } from "../../components/ShinyGradientButton";

// Constants from your original file
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
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "describe">("upload");
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [form, setForm] = useState({
    age: "",
    gender: "",
    hairType: "",
    hairColor: "",
    skinTone: skinTones[1],
  });

  // NEW: Add a loading state for the API call
  const [isLoading, setIsLoading] = useState(false);

  // Helper functions from your original file
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

  // Logic from your original file
  const formValid = form.age && form.gender && form.hairType && form.hairColor;
  const canContinue =
    (tab === "upload" && uploadedUri) || (tab === "describe" && formValid);

  const continueNext = () =>
    canContinue && router.push("/(tab)/DashboardScreen");

  // Dropdown component from your original file
  const SimpleDropdown = ({
    selected,
    onSelect,
    items,
    placeholder,
    field,
  }: {
    selected: string;
    onSelect: (value: string) => void;
    items: readonly string[];
    placeholder: string;
    field: string;
  }) => (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.dropdownButton,
          pressed && { backgroundColor: "rgba(0,234,255,0.2)" },
        ]}
        onPress={() =>
          setActiveDropdown(activeDropdown === field ? null : field)
        }
      >
        <Text
          style={[styles.dropdownText, !selected && styles.placeholderText]}
        >
          {selected || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color="#00EAFF"
          style={{
            transform: [
              { rotate: activeDropdown === field ? "180deg" : "0deg" },
            ],
          }}
        />
      </Pressable>

      {activeDropdown === field && (
        <View style={styles.dropdownList}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            style={{ maxHeight: 200 }}
          >
            {items.map((item) => (
              <Pressable
                key={item}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  pressed && { backgroundColor: "rgba(0,234,255,0.2)" },
                ]}
                onPress={() => {
                  onSelect(item);
                  setActiveDropdown(null);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selected === item && {
                      color: "#00EAFF",
                      fontWeight: "600",
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
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
                <Ionicons name="camera" size={46} color="#00EAFF" />
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
              <SimpleDropdown
                selected={form.age}
                onSelect={(v) => updateForm("age", v)}
                items={ages}
                placeholder="Select age"
                field="age"
              />
            </View>
            <View>
              <Text style={styles.label}>Gender</Text>
              <SimpleDropdown
                selected={form.gender}
                onSelect={(v) => updateForm("gender", v)}
                items={genders}
                placeholder="Select gender"
                field="gender"
              />
            </View>
            <View>
              <Text style={styles.label}>Hair Type</Text>
              <SimpleDropdown
                selected={form.hairType}
                onSelect={(v) => updateForm("hairType", v)}
                items={hairTypes}
                placeholder="Select type"
                field="hairType"
              />
            </View>
            <View>
              <Text style={styles.label}>Hair Color</Text>
              <SimpleDropdown
                selected={form.hairColor}
                onSelect={(v) => updateForm("hairColor", v)}
                items={hairColors}
                placeholder="Select color"
                field="hairColor"
              />
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

        {/* Bottom buttons */}
        <View style={styles.bottomContainer}>
          <ShinyGradientButton onPress={continueNext}>
            Continue
          </ShinyGradientButton>
          <Pressable
            onPress={() => router.push("/(tab)/DashboardScreen")}
            style={{ marginTop: 12 }}
          >
            <Text style={styles.skipText}>skip</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default CreateToonScreen;

// All styles are from your original file
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollBody: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 80,
    textAlign: "center",
  },
  subHeading: {
    color: "#a7a7a7",
    fontSize: 18,
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },
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
    marginTop: 32,
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
  label: { color: "#FFFFFF", fontSize: 14, marginBottom: 6 },
  dropdownButton: {
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.4)",
    borderRadius: 12,
    backgroundColor: "rgba(0,234,255,0.1)",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  placeholderText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "400",
  },
  dropdownList: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: "rgba(13,10,60,0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.3)",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    minHeight: 48,
    justifyContent: "center",
  },
  dropdownItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  toneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  toneSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toneSwatchActive: {
    transform: [{ scale: 1.1 }],
    borderColor: "#00EAFF",
    shadowColor: "#00EAFF",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  skipText: { color: "#a7a7a7", fontSize: 16, textAlign: "center" },
  bottomContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 40,
  },
});
