import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useUser } from "../../context/UserContext";

/*********************
 * Types & constants
 *********************/
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface ComicEntry {
  id: string;
  created_at: string; // ISO
  title: string;
  style: string;
  liked: boolean;
  image_urls: string[];
}

/*********************
 * Sparkle helper
 *********************/
const Sparkle: React.FC<{
  delay?: number;
  size?: number;
  x: number;
  y: number;
}> = ({ delay = 0, size = 8, x, y }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1500,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 1500,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [opacity, scale, delay]);

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          width: size,
          height: size,
          top: y,
          left: x,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

/*********************
 * Floating wrapper
 *********************/
const FloatingCard: React.FC<{ delay: number; children: React.ReactNode }> = ({
  children,
  delay,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -5,
          duration: 1800,
          delay,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY, delay]);

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

/*********************
 * Screen component
 *********************/
export const TimelineScreen: React.FC = () => {
  const router = useRouter();
  const { profile } = useUser();

  const [monthIdx, setMonthIdx] = useState(() => new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [comics, setComics] = useState<ComicEntry[]>([]);

  /*──────── Fetch comics – ORIGINAL LOGIC ────────*/
  const fetchComics = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comics")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: ComicEntry[] = (data ?? []).map((c: any) => ({
        id: c.id,
        created_at: c.created_at,
        title: c.storyboard?.title ?? "Untitled Dream",
        style: c.storyboard?.style ?? "Dream Comic",
        liked: c.liked ?? false,
        image_urls: c.image_urls ?? [],
      }));

      setComics(mapped);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load your dreams. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComics();
  }, [profile]);

  /*──────── Helpers ────────*/
  const toggleLike = async (id: string) => {
    setComics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, liked: !c.liked } : c))
    );
    const target = comics.find((c) => c.id === id);
    if (!target) return;
    await supabase.from("comics").update({ liked: !target.liked }).eq("id", id);
  };

  /*──────── Month filter ────────*/
  const filtered = comics.filter(
    (c) => new Date(c.created_at).getMonth() === monthIdx
  );

  /*──────── Render ────────*/
  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <LinearGradient
        colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Sparkles */}
      <Sparkle x={32} y={80} size={6} />
      <Sparkle x={SCREEN_WIDTH - 60} y={100} size={4} delay={600} />
      <Sparkle x={96} y={180} size={5} delay={1200} />
      <Sparkle x={SCREEN_WIDTH - 90} y={260} size={6} delay={300} />

      {/* Settings */}
      <Pressable
        style={styles.settingsBtn}
        onPress={() => router.push("/(tab)/SettingScreen")}
      >
        <Ionicons name="settings" size={20} color="#fff" />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Timeline</Text>

        {/* Month selector */}
        <View style={styles.monthBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthBar}
          >
            {MONTHS.map((m, idx) => (
              <Pressable
                key={m}
                style={[
                  styles.monthChip,
                  idx === monthIdx && styles.monthChipActive,
                ]}
                onPress={() => setMonthIdx(idx)}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    idx === monthIdx && styles.monthChipTextActive,
                  ]}
                >
                  {m}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator
            color="#00eaff"
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No dreams this month.</Text>
        ) : (
          filtered.map((c, idx) => (
            <FloatingCard key={c.id} delay={idx * 200}>
              <Pressable
                style={styles.card}
                onPress={() => {
                  router.push({
                    pathname: "/(tab)/ComicResultScreen",
                    params: { urls: JSON.stringify(c.image_urls) },
                  });
                }}
              >
                {/* header */}
                <View style={styles.cardHeader}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Pressable
                    onPress={() => toggleLike(c.id)}
                    style={[styles.likeBtn, c.liked && styles.likeBtnActive]}
                  >
                    <Ionicons
                      name="heart"
                      size={16}
                      color={c.liked ? "#fff" : "#ff4ee0"}
                    />
                  </Pressable>
                </View>

                {/* comic preview */}
                <LinearGradient
                  colors={["rgba(0,234,255,0.15)", "rgba(255,78,224,0.12)"]}
                  style={styles.preview}
                >
                  <View style={styles.grid}>
                    {c.image_urls &&
                      c.image_urls.slice(0, 6).map((url, i) => (
                        <View
                          key={i}
                          style={[
                            styles.panel,
                            {
                              backgroundColor: "#222",
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: url }}
                            style={styles.panelImage}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                  </View>
                  <Text style={styles.previewLabel} numberOfLines={1}>
                    {c.style.toUpperCase()}
                  </Text>
                </LinearGradient>
              </Pressable>
            </FloatingCard>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          style={styles.navBtn}
          onPress={() => router.push("/(tab)/DashboardScreen")}
        >
          <Ionicons name="home" size={24} color="#a7a7a7" />
        </Pressable>
        <Pressable
          style={styles.navBtn}
          onPress={() => router.push("/(tab)/TimelineScreen")}
        >
          <Ionicons name="book" size={24} color="#00EAFF" />
        </Pressable>
      </View>
    </View>
  );
};

/*********************
 * Styles
 *********************/
const styles = StyleSheet.create({
  root: { flex: 1 },
  sparkle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  settingsBtn: {
    position: "absolute",
    top: 24,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scroll: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    alignSelf: "center",
    marginBottom: 24,
  },
  monthBarContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  monthBar: {
    flexDirection: "row",
    minWidth: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  monthChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginRight: 8,
  },
  monthChipActive: { backgroundColor: "rgba(0,234,255,0.8)" },
  monthChipText: { fontSize: 12, color: "#a7a7a7" },
  monthChipTextActive: { color: "#fff" },
  empty: { color: "#d4d4d8", textAlign: "center", marginTop: 60 },
  /* Card */
  card: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dateBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dateText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardTitle: { flex: 1, color: "#fff", marginLeft: 12, fontWeight: "600" },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ff4ee0",
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtnActive: {
    backgroundColor: "#ff4ee0",
    borderColor: "#ff4ee0",
  },
  /* preview */
  preview: {
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  panel: { flexBasis: "30%", aspectRatio: 1, borderRadius: 8 },
  previewLabel: {
    color: "#00eaff",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  panelImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  navBar: {
    position: "absolute",
    bottom: 20,
    left: "5%",
    right: "5%",
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(13,10,60,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navBtn: { padding: 8, borderRadius: 12 },
});

export default TimelineScreen;
