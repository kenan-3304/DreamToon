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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useUser } from "../../context/UserContext";
import Background from "../../components/ui/Background";

/*********************
 * Types & constants
 *********************/
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Device detection
const isTablet = () => {
  const { width, height } = Dimensions.get("window");
  const aspectRatio = height / width;
  return aspectRatio <= 1.6;
};

const isIPad = Platform.OS === "ios" && isTablet();

// Responsive breakpoints
const BREAKPOINTS = {
  small: 375,
  medium: 768,
  large: 1024,
};

const getResponsiveValue = (phone: number, tablet: number) => {
  return isIPad ? tablet : phone;
};

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
  image_urls: string[];
}

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
      // 1. Get the user's session to retrieve the access token.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated. Cannot fetch comics.");
      }

      // 2. Call your new backend endpoint with the authorization header.
      //    Replace "https://your-backend-url" with your actual backend's URL.
      const response = await fetch("https://your-backend-url/comics/", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        // Handle potential errors from your backend API
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to fetch comics from server."
        );
      }

      // 3. The backend returns the comics with valid, signed URLs ready for display.
      const comicsFromServer: ComicEntry[] = await response.json();
      setComics(comicsFromServer);
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

  /*──────── Month filter ────────*/
  const filtered = comics.filter(
    (c) => new Date(c.created_at).getMonth() === monthIdx
  );

  /*──────── Render ────────*/
  return (
    <Background source={require("../../assets/images/timeline.jpeg")}>
      <View style={styles.root}>
        {/* Gradient background */}
        <LinearGradient
          colors={[
            "rgba(13,10,60,0.3)",
            "rgba(13,10,60,0.1)",
            "rgba(0,0,0,0.1)",
          ]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Settings */}
        <Pressable
          style={[styles.settingsBtn, isIPad && styles.settingsBtnTablet]}
          onPress={() => router.push("/(tab)/SettingScreen")}
        >
          <Ionicons
            name="settings"
            size={getResponsiveValue(20, 28)}
            color="#fff"
          />
        </Pressable>

        <ScrollView
          contentContainerStyle={[styles.scroll, isIPad && styles.scrollTablet]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={[styles.title, isIPad && styles.titleTablet]}>
            Timeline
          </Text>

          {/* Month selector */}
          <View
            style={[
              styles.monthBarContainer,
              isIPad && styles.monthBarContainerTablet,
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.monthBar,
                isIPad && styles.monthBarTablet,
              ]}
            >
              {MONTHS.map((m, idx) => (
                <Pressable
                  key={m}
                  style={[
                    styles.monthChip,
                    isIPad && styles.monthChipTablet,
                    idx === monthIdx && styles.monthChipActive,
                  ]}
                  onPress={() => setMonthIdx(idx)}
                >
                  <Text
                    style={[
                      styles.monthChipText,
                      isIPad && styles.monthChipTextTablet,
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
            <Text style={[styles.empty, isIPad && styles.emptyTablet]}>
              No dreams this month.
            </Text>
          ) : (
            filtered.map((c, idx) => (
              <FloatingCard key={c.id} delay={idx * 200}>
                <Pressable
                  style={styles.card}
                  onPress={() => {
                    router.push({
                      pathname: "/(tab)/ComicResultScreen",
                      params: {
                        urls: JSON.stringify(c.image_urls),
                        title: c.title,
                        id: c.id,
                      },
                    });
                  }}
                >
                  {/* header */}
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.dateBadge,
                        isIPad && styles.dateBadgeTablet,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateText,
                          isIPad && styles.dateTextTablet,
                        ]}
                      >
                        {new Date(c.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.cardTitle,
                        isIPad && styles.cardTitleTablet,
                      ]}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                  </View>

                  {/* comic preview */}
                  <LinearGradient
                    colors={[
                      "rgba(166, 19, 117, 0.15)",
                      "rgba(255,78,224,0.12)",
                    ]}
                    style={styles.preview}
                  >
                    <View style={styles.gridCentered}>
                      {c.image_urls && c.image_urls.length > 0 && (
                        <View style={styles.panel}>
                          <Image
                            source={{ uri: c.image_urls[0] }} // Only load the first image
                            style={styles.panelImage}
                            resizeMode="cover"
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.previewLabel,
                        isIPad && styles.previewLabelTablet,
                      ]}
                      numberOfLines={1}
                    >
                      {c.style.toUpperCase()}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </FloatingCard>
            ))
          )}

          <View style={{ height: getResponsiveValue(120, 160) }} />
        </ScrollView>

        {/* Navigation Bar */}
        <View style={[styles.navBar, isIPad && styles.navBarTablet]}>
          <Pressable
            style={styles.navBtn}
            onPress={() => router.push("/(tab)/EnhancedDashboardScreen")}
          >
            <Ionicons
              name="home"
              size={getResponsiveValue(24, 32)}
              color="#C879FF"
            />
          </Pressable>
          <Pressable
            style={styles.navBtn}
            onPress={() => router.push("/(tab)/TimelineScreen")}
          >
            <Ionicons
              name="book"
              size={getResponsiveValue(24, 32)}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>
    </Background>
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
  settingsBtnTablet: {
    top: 40,
    left: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  scroll: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scrollTablet: {
    paddingTop: 120,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    alignSelf: "center",
    marginBottom: 24,
  },
  titleTablet: {
    fontSize: 48,
    marginBottom: 32,
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
  monthBarContainerTablet: {
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  monthBar: {
    flexDirection: "row",
    minWidth: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  monthBarTablet: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  monthChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginRight: 8,
  },
  monthChipTablet: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
  monthChipActive: { backgroundColor: "rgba(177, 63, 179, 0.8)" },
  monthChipText: { fontSize: 12, color: "#a7a7a7" },
  monthChipTextTablet: { fontSize: 16 },
  monthChipTextActive: { color: "#fff" },
  empty: { color: "#d4d4d8", textAlign: "center", marginTop: 60 },
  emptyTablet: { fontSize: 18, marginTop: 80 },
  card: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 28,
    padding: 23,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dateBadge: {
    backgroundColor: "",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dateBadgeTablet: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  dateTextTablet: { fontSize: 14 },
  cardTitle: { flex: 1, color: "#fff", marginLeft: 12, fontWeight: "600" },
  cardTitleTablet: { fontSize: 16, marginLeft: 16 },
  /* preview */
  preview: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  previewTablet: {
    borderRadius: 24,
    padding: 16,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  gridCentered: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: -6,
    marginTop: 2,
    justifyContent: "center",
  },
  panel: { flexBasis: "30%", aspectRatio: 1, borderRadius: 8 },
  previewLabel: {
    color: "#00eaff",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  previewLabelTablet: {
    fontSize: 12,
  },
  panelImage: {
    width: "102%",
    height: "102%",
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
    borderColor: "rgba(251, 251, 251, 0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navBarTablet: {
    bottom: 40,
    left: "10%",
    right: "10%",
    height: 90,
    borderRadius: 45,
  },
  navBtn: { padding: 8, borderRadius: 12 },
});

export default TimelineScreen;
