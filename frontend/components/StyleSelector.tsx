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
      "A beautiful and whimsical portrait in the art style of Studio Ghibli. Lush, hand-painted watercolor background with detailed foliage and soft, warm sunlight. Clean, expressive character design inspired by Hayao Miyazaki, with a sense of wonder and nostalgia. Cinematic, pastoral, heartwarming.",
    image: require("../assets/images/studio_ghibli.png"),
  },
  {
    name: "Adventure Time",
    prompt:
      "A quirky and surreal portrait in the distinct art style of Adventure Time. Simple, rounded character designs with 'noodle' limbs and minimalist dot eyes. Rendered with flat, vibrant colors and thick, clean outlines against a whimsical, candy-colored landscape. Art by Pendleton Ward, cartoon network style.",
    image: require("../assets/images/adventure_time.png"),
  },
  {
    name: "DC Comics",
    prompt:
      "A dynamic and heroic portrait in the style of modern DC Comics. Strong, anatomical character with a dramatic pose. Detailed ink work with heavy use of shadows and cross-hatching for a gritty, high-contrast look. Cinematic lighting, graphic novel aesthetic, art by Jim Lee.",
    image: require("../assets/images/dc.jpg"),
  },
  {
    name: "Simpsons",
    prompt:
      "A satirical and humorous portrait in the iconic art style of The Simpsons. Character with yellow skin, large round eyes, and a prominent overbite. Rendered in a 2D flat color style with bold black outlines, reminiscent of Matt Groening's animation.",
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
