import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ImageBackground,
  StyleSheet,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "../context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Define the style type
interface Style {
  name: string;
  prompt: string;
  image: any;
  description: string;
}

// Define all your app's styles here
const ALL_STYLES: Style[] = [
  {
    name: "Ghibli",
    prompt:
      "Create a stylized character drawing inspired by the art style of Studio Ghibli. Use soft, hand-painted watercolor textures with a lush natural background and gentle sunlight. The character should evoke a warm, nostalgic feeling, with expressive features and a sense of childlike wonder. The input image provides reference for mood, pose, and hair silhouette, not for realism.",
    image: require("../assets/images/studio_ghibli.png"),
    description: "Magical watercolor dreams",
  },
  {
    name: "Adventure Time",
    prompt:
      "Create a cartoon-style character drawing in the art style of Adventure Time: simple, rounded character design, noodle limbs, dot eyes, vibrant flat colors, thick outlines, and a candy-colored background. The input image provides general reference for mood, lighting, and character silhouette, but should not be interpreted literally or photorealistically",
    image: require("../assets/images/adventure_time.png"),
    description: "Candy-colored adventures",
  },
  {
    name: "DC Comics",
    prompt:
      "Create a stylized superhero character in the aesthetic of modern DC Comics. Use bold anatomy, dynamic posing, dramatic lighting, and detailed ink lines with cross-hatching. The character should have a gritty, high-contrast graphic novel look, and a cinematic and serious tone. Use the input image only as loose reference for posture and mood — do not replicate the person.",
    image: require("../assets/images/dc.jpg"),
    description: "Epic superhero action",
  },
  {
    name: "Simpsons",
    prompt:
      "Create a stylized cartoon character in the art style of The Simpsons. Use flat colors, yellow skin tone, oversized round eyes, and simple linework with bold outlines. Place the character in a satirical, suburban setting. Use the input image as loose reference for pose and general hairstyle, but avoid realism or facial replication.",
    image: require("../assets/images/simpsons.png"),
    description: "Springfield style fun",
  },
];

interface StyleSelectorProps {
  onStyleSelect: (style: Style) => void;
  mode?: "selection" | "creation";
  onClose?: () => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  onStyleSelect,
  mode = "selection",
  onClose,
}) => {
  const { unlockedStyles } = useUser();
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);

  // Animation values
  const headerScale = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardRotation = useSharedValue(0);

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

  const handleStylePress = (style: Style) => {
    const isUnlocked = unlockedStyles.includes(style.name);
    const isSelectable = mode === "creation" || isUnlocked;

    if (!isSelectable) {
      triggerHaptic("heavy");
      return;
    }

    triggerHaptic("medium");
    setSelectedStyle(style);

    // Animate card press
    cardScale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
    cardRotation.value = withSpring(5, { damping: 15, stiffness: 100 });

    setTimeout(() => {
      cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      cardRotation.value = withSpring(0, { damping: 15, stiffness: 100 });
      onStyleSelect(style);
    }, 200);
  };

  const renderStyleCard = ({
    item: style,
    index,
  }: {
    item: Style;
    index: number;
  }) => {
    const isUnlocked = unlockedStyles.includes(style.name);
    const isSelectable = mode === "creation" || isUnlocked;

    return (
      <AnimatedPressable
        style={[styles.card, { animationDelay: index * 150 }]}
        onPress={() => handleStylePress(style)}
        onPressIn={() => {
          if (isSelectable) {
            triggerHaptic("light");
          }
        }}
      >
        <ImageBackground
          source={style.image}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.gradientOverlay}
          >
            <View style={styles.cardContent}>
              <Text style={styles.styleName}>{style.name}</Text>
              <Text style={styles.styleDescription}>{style.description}</Text>

              {!isUnlocked && (
                <View style={styles.lockContainer}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                  <Text style={styles.lockText}>Create avatar to unlock</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {!isSelectable && (
            <View style={styles.lockedOverlay}>
              <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
              <Text style={styles.lockedText}>Locked</Text>
              <Text style={styles.lockedSubtext}>
                Create avatar in this style first
              </Text>
            </View>
          )}
        </ImageBackground>
      </AnimatedPressable>
    );
  };

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotate: `${cardRotation.value}deg` },
    ],
  }));

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      {/* Enhanced Header */}
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>🎨 Choose Your Style</Text>
          <Text style={styles.subtitle}>
            Transform yourself into different worlds
          </Text>
        </View>
        <Pressable
          style={styles.closeButton}
          onPress={() => {
            triggerHaptic("light");
            onClose?.();
          }}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      {/* Style Grid */}
      <FlatList
        data={ALL_STYLES}
        renderItem={renderStyleCard}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#E0B0FF",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  listContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    width: getResponsiveValue(160, 200),
    height: getResponsiveValue(200, 250),
    borderRadius: 20,
    margin: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  imageBackground: {
    flex: 1,
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  cardContent: {
    padding: 16,
  },
  styleName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 8,
  },
  styleDescription: {
    color: "#E0B0FF",
    fontSize: 12,
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  lockText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  lockedSubtext: {
    color: "#E0B0FF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
