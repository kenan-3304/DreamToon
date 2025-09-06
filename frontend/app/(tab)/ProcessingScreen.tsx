import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../context/UserContext";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenLayout } from "@/components/ScreenLayout";
const dreamFacts = [
  "You forget about 90% of your dreams within 10 minutes of waking up.",
  "Anxiety is the most common emotion experienced in dreams.",
  "Your brain is sometimes more active during REM sleep than when you're awake.",
  "Some people dream only in black and white—around 12% of the population.",
  "During a typical lifetime, an average person spends about six years dreaming.",
  "You can't read text or tell time accurately while in a dream.",
  "Animals, including cats and dogs, almost certainly dream.",
  "During REM sleep, your body's muscles are temporarily paralyzed to prevent you from acting out your dreams.",
  "Many creative breakthroughs, like the idea for Google, have reportedly come from dreams.",
];

const ProcessingScreen: React.FC = () => {
  const router = useRouter();
  const { dream_id } = useLocalSearchParams();
  const [currentFact, setCurrentFact] = useState(dreamFacts[0]);
  const factIndexRef = useRef(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Effect for shuffling facts (remains the same)
  useEffect(() => {
    const factInterval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * dreamFacts.length);
        } while (nextIndex === factIndexRef.current);

        factIndexRef.current = nextIndex;
        setCurrentFact(dreamFacts[nextIndex]);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 10000);

    return () => clearInterval(factInterval);
  }, [fadeAnim]);

  // Effect for checking comic status (remains the same)

  return (
    <ScreenLayout>
      {/* ---- TOP CONTAINER (STABLE) ---- */}
      {/* This section holds the content that should NOT move. */}
      {/* It takes up the top 55% of the screen and aligns its content to the bottom. */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={32} color={"white"} />
      </Pressable>
      <View style={styles.topContainer}>
        <LottieView
          source={require("../../assets/loading-animation.json")}
          style={styles.lottieAnimation}
          autoPlay
          loop
        />
        <Text style={styles.title}>Creating Your Comic</Text>
        <Text style={styles.infoText}>
          Your comic is being created... Feel free to come back in a few minutes
          to check on its progress.
        </Text>
      </View>

      {/* ---- BOTTOM CONTAINER (DYNAMIC) ---- */}
      {/* This section holds the text that changes size. */}
      {/* It takes up the bottom 45% and aligns its content to the top. */}
      <View style={styles.bottomContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.subtitle}>{currentFact}</Text>
        </Animated.View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Changed: This allows children to use flex to divide the space
  },
  // New style for the top, stable part of the screen
  topContainer: {
    flex: 0.55, // Takes up the top 55% of the screen
    justifyContent: "flex-end", // Aligns content to its bottom (near the center)
    alignItems: "center",
  },
  // New style for the bottom, dynamic part of the screen
  bottomContainer: {
    flex: 0.45, // Takes up the bottom 45% of the screen
    justifyContent: "flex-start", // Aligns content to its top (near the center)
    alignItems: "center",
    paddingHorizontal: 20, // Keep horizontal padding for the text
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 20,
    textAlign: "center",
  },

  infoText: {
    fontSize: 14,
    color: "#FFFFFF", // Changed from "#c1c1c1" to more white
    textAlign: "center",
    marginTop: 12,
    marginBottom: 30, // Added bottom margin to create more space
  },

  subtitle: {
    fontSize: 16,
    color: "#888888", // Changed from "#a7a7a7" to more grey
    marginTop: 20, // Give it some space from the title
    textAlign: "center",
    lineHeight: 24,
    // minHeight is no longer needed with this layout!
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
});

export default ProcessingScreen;
