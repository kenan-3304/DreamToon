import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

const ProcessingScreen: React.FC = () => {
  const router = useRouter();
  const { dream_id } = useLocalSearchParams();
  const [status, setStatus] = useState("processing");
  const [panelUrls, setPanelUrls] = useState([]);

  useEffect(() => {
    if (!dream_id) return;
    const interval = setInterval(async () => {
      const res = await fetch(
        `https://dreamtoon.onrender.com/comic-status/${dream_id}`
      );
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "complete") {
        setPanelUrls(data.panel_urls);
        clearInterval(interval);
        // Navigate to result screen
        router.replace({
          pathname: "/(tab)/ComicResultScreen",
          params: { urls: JSON.stringify(data.panel_urls) },
        });
      } else if (data.status === "error") {
        clearInterval(interval);
        Alert.alert("Error", "Comic generation failed.");
        router.replace("/(tab)/EnhancedDashboardScreen");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [dream_id]);

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
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
