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
    prompt: "a vibrant, whimsical portrait in the Studio Ghibli art style...",
    image: require("../assets/images/studio_ghibli.png"),
  },
  {
    name: "Adventure Time",
    prompt: "a dynamic portrait in a modern anime art style...",
    image: require("../assets/images/adventure_time.png"),
  },
  {
    name: "DC Comics",
    prompt: "DC Comics style",
    image: require("../assets/images/dc.jpg"),
  },
  {
    name: "Simpsons",
    prompt: "Simpsons style",
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
