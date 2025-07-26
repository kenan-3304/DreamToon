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

// Define all your app's styles here
const ALL_STYLES = [
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

export const StyleSelector = ({ onStyleSelect, mode = "selection" }) => {
  const { unlockedStyles } = useUser();

  const renderStyleCard = ({ item: style }) => {
    const isUnlocked = unlockedStyles.includes(style.name);
    // --- FIX: A style is selectable if we are in 'creation' mode OR if it's already unlocked ---
    const isSelectable = mode === "creation" || isUnlocked;

    return (
      <Pressable
        style={styles.card}
        onPress={() => onStyleSelect(style)}
        disabled={!isSelectable} // <-- Use the new 'isSelectable' variable
      >
        <ImageBackground
          source={style.image}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.textContainer}>
            <Text style={styles.styleName}>{style.name}</Text>
          </View>

          {/* --- FIX: Show the locked overlay only if it's NOT selectable --- */}
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
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Style</Text>
      <FlatList
        data={ALL_STYLES}
        renderItem={renderStyleCard}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

// --- StyleSheet for a clean look ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  listContainer: {
    alignItems: "center",
  },
  card: {
    width: 150,
    height: 150,
    borderRadius: 15,
    margin: 10,
    overflow: "hidden", // Ensures the ImageBackground respects the borderRadius
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  imageBackground: {
    flex: 1,
    justifyContent: "flex-end", // Aligns the text container to the bottom
  },
  textContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  styleName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject, // Makes the overlay cover the entire card
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});
