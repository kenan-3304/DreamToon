import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

// This component will provide the consistent background and safe area for your screens.
export const ScreenLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      {/* SafeAreaView ensures your content (the children) is not hidden by the Dynamic Island */}
      <SafeAreaView style={styles.container}>{children}</SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
