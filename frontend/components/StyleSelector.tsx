import React from "react";
import {
  View,
  Text,
  Pressable,
  ImageBackground,
  StyleSheet,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "../context/UserContext";
import { Ionicons } from "@expo/vector-icons";

// Define the style type
interface Style {
  name: string;
  prompt: string;
  image: any;
}

// Define all your app's styles here
const ALL_STYLES: Style[] = [
  {
    name: "Ghibli",
    prompt:
      "Create a stylized character drawing inspired by the art style of Studio Ghibli. Use soft, hand-painted watercolor textures with a lush natural background and gentle sunlight. The character should evoke a warm, nostalgic feeling, with expressive features and a sense of childlike wonder. The input image provides reference for mood, pose, and hair silhouette, not for realism.",
    image: require("../assets/images/studio_ghibli.png"),
  },
  {
    name: "Adventure Time",
    prompt:
      "Create a cartoon-style character drawing in the art style of Adventure Time: simple, rounded character design, noodle limbs, dot eyes, vibrant flat colors, thick outlines, and a candy-colored background. The input image provides general reference for mood, lighting, and character silhouette, but should not be interpreted literally or photorealistically",
    image: require("../assets/images/adventure_time.png"),
  },
  {
    name: "DC Comics",
    prompt:
      "Create a stylized superhero character in the aesthetic of modern DC Comics. Use bold anatomy, dynamic posing, dramatic lighting, and detailed ink lines with cross-hatching. The character should have a gritty, high-contrast graphic novel look, and a cinematic and serious tone. Use the input image only as loose reference for posture and mood — do not replicate the person.",
    image: require("../assets/images/dc.jpg"),
  },
  {
    name: "Simpsons",
    prompt:
      "Create a stylized cartoon character in the art style of The Simpsons. Use flat colors, yellow skin tone, oversized round eyes, and simple linework with bold outlines. Place the character in a satirical, suburban setting. Use the input image as loose reference for pose and general hairstyle, but avoid realism or facial replication.",
    image: require("../assets/images/simpsons.png"),
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

  const renderStyleCard = ({ item: style }: { item: Style }) => {
    const isUnlocked = unlockedStyles.includes(style.name);
    const isSelectable = mode === "creation" || isUnlocked;

    return (
      <Pressable
        style={styles.card}
        onPress={() => onStyleSelect(style)}
        disabled={!isSelectable}
      >
        <ImageBackground
          source={style.image}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.textContainer}>
            <Text style={styles.styleName}>{style.name}</Text>
          </View>

          {!isSelectable && (
            <View style={styles.lockedOverlay}>
              <Ionicons name="lock-closed" size={32} color="#FFFFFF" />
            </View>
          )}
        </ImageBackground>
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Style</Text>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </Pressable>
      </View>
      <FlatList
        data={ALL_STYLES}
        renderItem={renderStyleCard}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
};

// --- StyleSheet for a clean look ---
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  listContainer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  card: {
    width: 160,
    height: 160,
    borderRadius: 20,
    margin: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageBackground: {
    flex: 1,
    justifyContent: "flex-end",
  },
  textContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  styleName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
