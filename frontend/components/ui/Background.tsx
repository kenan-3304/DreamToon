import React from "react";
import { ImageBackground, StyleSheet, ImageSourcePropType } from "react-native";

export default function Background({
  children,
  source,
}: {
  children: React.ReactNode;
  source?: ImageSourcePropType;
}) {
  return (
    <ImageBackground
      source={source || require("../../assets/images/dark.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
