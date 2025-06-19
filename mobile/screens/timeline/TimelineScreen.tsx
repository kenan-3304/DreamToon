import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Settings, Heart, Home, Book } from "lucide-react-native";

interface DreamEntry {
  id: string;
  date: string;
  title: string;
  comic: string;
  liked: boolean;
  thumbUris: string[]; // 6 thumbs
}

const MONTHS = ["May", "June", "July", "Aug", "Sept", "Nov"];

const MOCK: DreamEntry[] = [
  {
    id: "1",
    date: "Jun 14",
    title: "Adventures in Barcelona",
    comic: "BARCELONA DREAM HEIST",
    liked: true,
    thumbUris: Array(6).fill(require("../../assets/image-3.png")),
  },
  {
    id: "2",
    date: "Jun 15",
    title: "Flying Through Clouds",
    comic: "SKY DANCER CHRONICLES",
    liked: false,
    thumbUris: Array(6).fill(require("../../assets/image-3.png")),
  },
];

export default function TimelineScreen() {
  const nav = useNavigation();
  const [month, setMonth] = useState("June");

  // Navigation handler
  const goto = (route: string) => {
    if (route === "home") nav.navigate("Dashboard" as never);
    else if (route === "library") nav.navigate("Timeline" as never);
    else if (route === "settings") nav.navigate("Settings" as never);
  };

  /* floating cards */
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const transY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <LinearGradient colors={["#5524A6", "#1f115e"]} style={styles.container}>
      {/* top bar */}
      <View style={styles.topRow}>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => nav.navigate("Settings" as never)}
        >
          <Settings size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.header}>Timeline</Text>
      </View>

      {/* month selector */}
      <View style={styles.monthBar}>
        {MONTHS.map((m) => (
          <Pressable
            key={m}
            style={[styles.monthBtn, month === m && styles.monthActive]}
            onPress={() => setMonth(m)}
          >
            <Text
              style={[styles.monthText, month === m && styles.monthTextActive]}
            >
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* list */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {MOCK.map((d, idx) => (
          <Animated.View
            key={d.id}
            style={[
              styles.card,
              { transform: [{ translateY: transY }], marginTop: idx ? 24 : 0 },
            ]}
          >
            {/* date & like */}
            <View style={styles.rowBetween}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateTxt}>{d.date}</Text>
              </View>
              <Pressable
                style={[styles.likeBtn, d.liked && styles.likeBtnFilled]}
              >
                <Heart
                  size={18}
                  color={d.liked ? "#FFF" : "#FF4EE0"}
                  fill={d.liked ? "#FF4EE0" : "none"}
                />
              </Pressable>
            </View>
            <Text style={styles.title}>{d.title}</Text>

            {/* comic grid 3 x 2 */}
            <Text style={styles.comicLabel}>{d.comic}</Text>
            <View style={styles.gridWrap}>
              {d.thumbUris.map((u, i) => (
                <View
                  key={i}
                  style={[
                    styles.thumb,
                    {
                      marginRight: i % 3 === 2 ? 0 : 4,
                      marginBottom: i < 3 ? 4 : 0,
                    },
                  ]}
                >
                  <Image source={u} style={styles.thumbImg} />
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* nav bar */}
      <View style={styles.navBar}>
        <Pressable style={styles.navBtn} onPress={() => goto("home")}>
          <Home size={24} color="#a7a7a7" />
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => goto("library")}>
          <Book size={24} color="#00EAFF" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

/* -------------------------------- STYLES ------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  header: {
    flex: 1,
    textAlign: "center",
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
  },
  /* month */
  monthBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 18,
    padding: 8,
    marginBottom: 10,
  },
  monthBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 12,
  },
  monthActive: { backgroundColor: "rgba(0,234,255,0.8)" },
  monthText: { color: "#a7a7a7", fontSize: 12, fontWeight: "600" },
  monthTextActive: { color: "#FFF" },
  /* card */
  card: {
    marginHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 0,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dateTxt: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  likeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FF4EE0",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtnFilled: { backgroundColor: "#FF4EE0", borderColor: "#FF4EE0" },
  title: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  comicLabel: {
    color: "#00EAFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  thumb: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  thumbImg: { width: "100%", height: "100%" },
  navBar: {
    width: "90%",
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(13,10,60,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 20,
    alignSelf: "center",
  },
  navBtn: { padding: 8, borderRadius: 12 },
});
