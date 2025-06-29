import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ProcessingScreen: React.FC = () => {
  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#00EAFF" />
        <Text style={styles.title}>Creating Your Comic</Text>
        <Text style={styles.subtitle}>
          We're turning your dream into a beautiful comic...
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#a7a7a7",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 24,
  },
});

export default ProcessingScreen;

