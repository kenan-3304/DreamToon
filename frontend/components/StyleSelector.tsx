import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useUser } from "../context/UserContext";

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
    image: require("../assets/images/simpsons.jpg"),
  },
];

export const StyleSelector = ({ onStyleSelect }) => {
  const { unlockedStyles } = useUser();

  return (
    <View>
      <Text>Choose a Style</Text>
      {ALL_STYLES.map((style) => {
        const isUnlocked = unlockedStyles.includes(style.name);
        return (
          <Pressable
            key={style.name}
            onPress={() => onStyleSelect(style)}
            disabled={!isUnlocked}
          >
            <Image
              source={style.image}
              style={{ width: 100, height: 100, opacity: isUnlocked ? 1 : 0.4 }}
            />
            <Text>{style.name}</Text>
            {!isUnlocked && <Text>LOCKED</Text>}
          </Pressable>
        );
      })}
    </View>
  );
};
