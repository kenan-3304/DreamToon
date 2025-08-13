import React, { useEffect, useRef, useState, useCallback } from "react";
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
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import SimpleDropdown from "../../components/SimpleDropdown";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useUser } from "../../context/UserContext";

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
  style: string | null;
  image_urls: string[];
}

/*********************
 * Enhanced Floating wrapper
 *********************/
const FloatingCard: React.FC<{ delay: number; children: React.ReactNode }> = ({
  children,
  delay,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        delay: delay * 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: delay * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -8,
          duration: 2000,
          delay: delay * 200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY, scale, opacity, delay]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const years = Array.from(
    new Set(comics.map((c) => new Date(c.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  // Enhanced haptic feedback
  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "heavy" = "light") => {
      if (Platform.OS === "ios") {
        const hapticType =
          type === "light"
            ? Haptics.ImpactFeedbackStyle.Light
            : type === "medium"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy;
        Haptics.impactAsync(hapticType);
      }
    },
    []
  );

  /*──────── Fetch comics – ENHANCED LOGIC ────────*/
  const fetchComics = async (isRefresh = false) => {
    if (!profile) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated. Cannot fetch comics.");
      }

      const response = await fetch("https://dreamtoon.onrender.com/comics/", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to fetch comics from server."
        );
      }

      const comicsFromServer: ComicEntry[] = await response.json();
      setComics(comicsFromServer);
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Error",
        "Failed to load your dreams. Pull down to try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComics();
  }, [profile]);

  const handleRefresh = () => {
    triggerHaptic("light");
    fetchComics(true);
  };

  const handleMonthPress = (idx: number) => {
    triggerHaptic("light");
    setMonthIdx(idx);
  };

  const handleComicPress = (comic: ComicEntry) => {
    triggerHaptic("medium");
    router.push({
      pathname: "/(tab)/ComicResultScreen",
      params: {
        urls: JSON.stringify(comic.image_urls),
        id: comic.id,
      },
    });
  };

  /*──────── Month filter ────────*/
  const filtered = comics.filter(
    (c) => new Date(c.created_at).getMonth() === monthIdx
  );

  /*──────── Render ────────*/
  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, isIPad && styles.scrollTablet]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#E0B0FF"
            colors={["#E0B0FF"]}
          />
        }
      >
        {/* Enhanced Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, isIPad && styles.titleTablet]}>
            Your Dreams
          </Text>
          <Text style={styles.subtitle}>Relive your comic adventures</Text>
        </View>

        {/* Year and Month Filters */}
        <View style={styles.filtersContainer}>
          {/* Year Filter */}
          <View style={styles.yearFilterContainer}>
            <Text style={styles.filterLabel}>Year</Text>
            <SimpleDropdown
              selected={selectedYear.toString()}
              onSelect={(v) => setSelectedYear(parseInt(v as string, 10))}
              items={years.map(String)}
              placeholder="Select Year"
              field="year"
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              style={{ height: 44 }}
            />
          </View>

          {/* Enhanced Month selector */}
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
                  onPress={() => handleMonthPress(idx)}
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
        </View>

        {/* Enhanced Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#E0B0FF" size="large" />
            <Text style={styles.loadingText}>Loading your dreams...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="moon-outline" size={64} color="#E0B0FF" />
            <Text style={[styles.emptyText, isIPad && styles.emptyTextTablet]}>
              No dreams this month
            </Text>
            <Text style={styles.emptySubtext}>
              Create your first comic to see it here!
            </Text>
          </View>
        ) : (
          <View style={styles.comicsContainer}>
            {filtered.map((c, idx) => (
              <FloatingCard key={c.id} delay={idx}>
                <Pressable
                  style={[styles.card, isIPad && styles.cardTablet]}
                  onPress={() => handleComicPress(c)}
                  onPressIn={() => {
                    // Add press animation
                  }}
                >
                  {/* Enhanced header */}
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.dateBadge,
                        isIPad && styles.dateBadgeTablet,
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color="#E0B0FF"
                      />
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
                    <View style={styles.titleContainer}>
                      <Text
                        style={[
                          styles.cardTitle,
                          isIPad && styles.cardTitleTablet,
                        ]}
                        numberOfLines={2}
                      >
                        {c.title}
                      </Text>
                      {c.style && (
                        <Text style={styles.styleText}>{c.style}</Text>
                      )}
                    </View>
                  </View>

                  {/* Enhanced comic preview */}
                  <View style={styles.previewContainer}>
                    <View style={styles.comicFrame}>
                      {c.image_urls && c.image_urls.length > 0 && (
                        <View style={styles.panelContainer}>
                          <Image
                            source={{ uri: c.image_urls[0] }}
                            style={styles.panelImage}
                            resizeMode="cover"
                          />
                          <View style={styles.imageOverlay} />
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              </FloatingCard>
            ))}
          </View>
        )}

        <View style={{ height: getResponsiveValue(120, 160) }} />
      </ScrollView>
    </LinearGradient>
  );
};

/*********************
 * Enhanced Styles
 *********************/
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scrollTablet: {
    paddingTop: 100,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleTablet: {
    fontSize: 48,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#E0B0FF",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  filtersContainer: {
    marginBottom: 24,
  },
  yearFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 12,
  },
  filterLabel: {
    color: "#E0B0FF",
    fontSize: 16,
    fontWeight: "600",
  },
  monthBarContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  monthBarContainerTablet: {
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  monthChipTablet: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
  monthChipActive: {
    backgroundColor: "rgba(224,176,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(224,176,255,0.4)",
  },
  monthChipText: {
    fontSize: 14,
    color: "#B0B0B0",
    fontWeight: "600",
  },
  monthChipTextTablet: {
    fontSize: 16,
  },
  monthChipTextActive: {
    color: "#E0B0FF",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  loadingText: {
    color: "#E0B0FF",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#E0B0FF",
    textAlign: "center",
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyTextTablet: {
    fontSize: 20,
    marginTop: 20,
  },
  emptySubtext: {
    color: "#B0B0B0",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
  comicsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTablet: {
    padding: 28,
    borderRadius: 32,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  dateBadge: {
    backgroundColor: "rgba(224,176,255,0.1)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(224,176,255,0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateBadgeTablet: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateText: {
    color: "#E0B0FF",
    fontSize: 12,
    fontWeight: "700",
  },
  dateTextTablet: {
    fontSize: 14,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 22,
  },
  cardTitleTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  styleText: {
    color: "#B0B0B0",
    fontSize: 12,
    fontWeight: "500",
  },
  previewContainer: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  comicFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  panelContainer: {
    width: 140,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  panelImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 16,
  },
});

export default TimelineScreen;
