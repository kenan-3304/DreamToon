import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ShinyGradientButton } from "../../components/ShinyGradientButton";
import { avatarUtils } from "../../utils/avatarUtils";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../utils/supabase";
import * as Haptics from "expo-haptics";
import paywallActive from "@/context/PaywallContext";
import { ImageBackground } from "react-native";
import { ScreenLayout } from "@/components/ScreenLayout";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const CreateToonScreen: React.FC = () => {
  const router = useRouter();
  const { updateProfile, addPendingAvatar } = useUser();
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<{
    name: string;
    prompt: string;
  } | null>(null);

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

  const launchCamera = async () => {
    triggerHaptic("medium");
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required.");
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!r.canceled) {
        setUploadedUri(r.assets[0].uri);
        triggerHaptic("light");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to take photo");
    }
  };

  const launchLibrary = async () => {
    triggerHaptic("medium");
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Media library permission is required."
        );
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!r.canceled) {
        setUploadedUri(r.assets[0].uri);
        triggerHaptic("light");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to pick image");
    }
  };

  const handleStyleSelection = (style: { name: string; prompt: string }) => {
    triggerHaptic("light");
    setSelectedStyle(style);
  };

  const createAvatar = async () => {
    if (!uploadedUri || !selectedStyle) {
      Alert.alert("Error", "Please select a photo and style first.");
      return;
    }

    setIsCreating(true);
    triggerHaptic("heavy");

    try {
      // Check subscription status
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // const { data: profile } = await supabase
      //   .from("profiles")
      //   .select("subscription_status")
      //   .eq("id", user.id)
      //   .single();

      // // if (profile?.subscription_status === "free" && paywallActive) {
      // //   router.push("/(modals)/PaywallScreen");
      // //   return;
      // // }

      // Create avatar
      const response = await avatarUtils.createAvatar(
        uploadedUri,
        selectedStyle
      );
      if (response && response.job_id) {
        await addPendingAvatar(response.job_id);
        await updateProfile({ onboarding_complete: true });

        Alert.alert(
          "Creation Started!",
          "Your first avatar is being created in the background. We'll let you know when its ready. Welcom to DreamToon!",
          [
            {
              text: "Start Dreaming",
              onPress: () => router.replace("/(tab)"),
            },
          ]
        );
      } else {
        throw new Error("Failed to initialize avatar generation");
      }
    } catch (error: any) {
      setIsCreating(false);
      Alert.alert(
        "Creation Failed",
        error.message || "An unexpected error occurred."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    triggerHaptic("light");
    Alert.alert(
      "Skip Avatar Creation",
      "You can always create your avatar later in the Avatar Studio. Continue to the app?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            try {
              await updateProfile({ onboarding_complete: true });

              router.replace("/(tab)");
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to update profile. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const canCreate = uploadedUri && selectedStyle && !isCreating;

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons
            name="person-circle"
            size={getResponsiveValue(48, 64)}
            color="#E0B0FF"
          />
          <Text style={styles.heading}>Create Your Avatar</Text>
          <Text style={styles.subHeading}>
            Upload a selfie to create your personalized comic character
          </Text>
        </View>

        {/* Photo Upload Section */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Step 1: Upload Your Photo</Text>

          <Pressable style={styles.uploadBox} onPress={launchLibrary}>
            {uploadedUri ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: uploadedUri }}
                  style={styles.uploadedImg}
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="checkmark-circle" size={32} color="#E0B0FF" />
                  <Text style={styles.overlayText}>Photo Selected</Text>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons
                  name="camera"
                  size={getResponsiveValue(48, 64)}
                  color="#E0B0FF"
                />
                <Text style={styles.uploadText}>Tap to select photo</Text>
                <Text style={styles.uploadSubtext}>or take a new one</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.uploadButtons}>
            <ShinyGradientButton
              onPress={launchCamera}
              size="medium"
              variant="secondary"
            >
              <View style={styles.buttonContent}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Take Photo</Text>
              </View>
            </ShinyGradientButton>
          </View>
        </View>

        {/* Style Selection Section */}
        <View style={styles.styleSection}>
          <Text style={styles.sectionTitle}>Step 2: Choose Your Style</Text>

          <View style={styles.styleGrid}>
            {[
              {
                name: "Ghibli",
                prompt:
                  "Create a stylized character drawing inspired by the art style of Studio Ghibli. Use soft, hand-painted watercolor textures with a lush natural background and gentle sunlight. The character should evoke a warm, nostalgic feeling, with expressive features and a sense of childlike wonder. The input image provides reference for mood, pose, and hair silhouette, not for realism.",
                image: require("../../assets/images/ghibli.webp"),
                description: "Magical watercolor dreams",
              },
              {
                name: "Adventure Time",
                prompt:
                  "Create a cartoon-style character drawing in the art style of Adventure Time: simple, rounded character design, noodle limbs, dot eyes, vibrant flat colors, thick outlines, and a candy-colored background. The input image provides general reference for mood, lighting, and character silhouette, but should not be interpreted literally or photorealistically",
                image: require("../../assets/images/adventure.webp"),
                description: "Candy-colored adventures",
              },
              {
                name: "DC Comics",
                prompt:
                  "Create a character in a modern American comic book style, defined by gritty realism, dramatic chiaroscuro lighting, and detailed ink work with heavy cross-hatching. The character should have heroic proportions and a dynamic, cinematic pose, evoking the feel of a graphic novel. CRUCIALLY: The character must be a unique creation. Avoid any resemblance to existing superheroes like Superman or Batman, including their specific costumes, emblems, or iconic color schemes. Use the input image only as loose reference for posture and mood — do not replicate the person.",
                image: require("../../assets/images/dc_dark.jpg"),
                description: "Epic superhero action",
              },
              {
                name: "Simpsons",
                prompt:
                  "Create a stylized cartoon character in the art style of The Simpsons. Use flat colors, yellow skin tone, oversized round eyes, and simple linework with bold outlines. Place the character in a satirical, suburban setting. Use the input image as loose reference for pose and general hairstyle, but avoid realism or facial replication.",
                image: require("../../assets/images/simp.png"),
                description: "Springfield style fun",
              },
              {
                name: "Arcane",
                prompt:
                  "Create a stylized character drawing in the hand-painted realist style of Arcane / Riot Games. Use rich, painterly textures, dramatic chiaroscuro lighting, and an emotionally intense aesthetic. The character should have prestige-level quality, suitable for a dark, character-driven story. Use the input image as loose reference for posture and mood — do not replicate the person or strive for realism.",
                image: require("../../assets/images/arcane.jpg"),
                description: "Dramatic, painterly stories",
              },
              {
                name: "Surrealist",
                prompt:
                  "Create a stylized character drawing in the aesthetic of a Surrealist painting by Salvador Dalí or René Magritte. Use distorted, dreamlike logic, melting or unexpected objects, and a realistic yet uncanny rendering style. The scene should feel symbolic and psychologically charged. Use the input image only as a conceptual reference for the character's general form and theme — embrace abstraction and metamorphosis.",
                image: require("../../assets/images/surreal.jpg"),
                description: "Artistic, illogical dreamscapes",
              },
              {
                name: "Disney / Pixar",
                prompt:
                  "Create a character in the 3D animated film style of Disney/Pixar. The image should be glossy, cinematic, and emotionally rich, with soft, volumetric lighting and vibrant colors. The character should have expressive, large eyes and a friendly, appealing design suitable for a family movie. Use the input image as loose reference for the character's pose and mood, not for realism.",
                image: require("../../assets/images/pixar.webp"),
                description: "Glossy, cinematic adventures",
              },
              {
                name: "Retro 80s Anime",
                prompt:
                  "Create a character in the style of a retro 80s OVA anime like Akira or Ghost in the Shell. Use detailed and intricate linework, a muted color palette with pops of neon lighting, and a subtle film grain effect. The setting should feel like a cyberpunk or dystopian city. The character should have a nostalgic, hand-drawn look. Use the input image only as a conceptual reference for mood and pose.",
                image: require("../../assets/images/retro_anime.jpg"),
                description: "Nostalgic cyberpunk action",
              },
            ].map((style) => (
              <Pressable
                key={style.name}
                style={[
                  styles.styleCard,
                  selectedStyle?.name === style.name && styles.styleCardActive,
                ]}
                onPress={() => handleStyleSelection(style)}
              >
                <ImageBackground
                  source={style.image}
                  style={styles.styleCardImage}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
                    style={styles.styleCardGradient}
                  >
                    <Text
                      style={[
                        styles.styleCardText,
                        selectedStyle?.name === style.name &&
                          styles.styleCardTextActive,
                      ]}
                    >
                      {style.name}
                    </Text>
                    {selectedStyle?.name === style.name && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#E0B0FF"
                      />
                    )}
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <ShinyGradientButton
            onPress={createAvatar}
            disabled={!canCreate}
            size="large"
          >
            {isCreating ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.loadingText}>Creating your avatar...</Text>
              </View>
            ) : (
              "Create My Avatar"
            )}
          </ShinyGradientButton>

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

export default CreateToonScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollBody: {
    alignItems: "center",
    paddingHorizontal: getResponsiveValue(24, 40),
    paddingTop: getResponsiveValue(60, 80),
    paddingBottom: getResponsiveValue(40, 60),
  },
  header: {
    alignItems: "center",
    marginBottom: getResponsiveValue(40, 60),
  },
  heading: {
    fontSize: getResponsiveValue(32, 44),
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subHeading: {
    fontSize: getResponsiveValue(16, 20),
    color: "#E0B0FF",
    textAlign: "center",
    lineHeight: getResponsiveValue(24, 28),
    fontWeight: "500",
  },
  uploadSection: {
    width: "100%",
    marginBottom: getResponsiveValue(40, 60),
  },
  styleSection: {
    width: "100%",
    marginBottom: getResponsiveValue(40, 60),
  },
  sectionTitle: {
    fontSize: getResponsiveValue(18, 24),
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: getResponsiveValue(16, 24),
    textAlign: "center",
  },
  uploadBox: {
    width: getResponsiveValue(280, 400),
    height: getResponsiveValue(280, 400),
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(224,176,255,0.4)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: getResponsiveValue(24, 32),
    alignSelf: "center",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
  },
  uploadedImg: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  overlayText: {
    color: "#E0B0FF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    color: "#E0B0FF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  uploadSubtext: {
    color: "#B0B0B0",
    fontSize: 14,
    marginTop: 4,
  },
  uploadButtons: {
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  styleCard: {
    width: getResponsiveValue(160, 200),
    height: getResponsiveValue(120, 150),
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    margin: 4,
  },
  styleCardImage: {
    flex: 1,
  },
  styleCardGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  styleCardActive: {
    borderColor: "rgba(224,176,255,0.8)",
    borderWidth: 3,
  },
  styleCardText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  styleCardTextActive: {
    color: "#E0B0FF",
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
    marginTop: getResponsiveValue(20, 40),
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: "#B0B0B0",
    fontSize: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
