import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { useUser } from "../../context/UserContext";
import { avatarUtils } from "../../utils/avatarUtils";
import { Avatar } from "../../components/Avatar";
import { StyleSelector } from "../../components/StyleSelector";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ShinyGradientButton } from "@/components/ShinyGradientButton";
import * as Haptics from "expo-haptics";
import paywallActive from "@/context/PaywallContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio <= 1.6;
};
const isIPad = Platform.OS === "ios" && isTablet();
const getResponsiveValue = (phone: number, tablet: number) =>
  isIPad ? tablet : phone;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AvatarStudioScreen() {
  const router = useRouter();
  const {
    profile,
    refetchProfileAndData,
    updateProfile,
    addPendingAvatar,
    pendingAvatars,
  } = useUser();
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [avatars, setAvatars] = useState<{ path: string; signedUrl: string }[]>(
    []
  );

  // const [isPolling, setIsPolling] = useState(false);
  // const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh profile data to ensure avatar and timer are up to date
      refetchProfileAndData();
    }, [refetchProfileAndData])
  );

  // Animation values
  const headerScale = useSharedValue(1);
  const createButtonScale = useSharedValue(1);
  const createButtonRotation = useSharedValue(0);
  const collectionOpacity = useSharedValue(0);
  const collectionScale = useSharedValue(0.9);

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

  const isCooldownActive = () => {
    if (!profile?.last_avatar_created_at) return false;
    const lastDate = new Date(profile.last_avatar_created_at);
    const now = new Date();
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 * 7;
  };

  useEffect(() => {
    avatarUtils
      .getMyAvatarsWithSignedUrls()
      .then((data) => {
        setAvatars(
          (data || [])
            .filter((item) => item.path)
            .map(({ path, signedUrl }) => ({ path: path as string, signedUrl }))
        );
      })
      .catch((err) => {
        Alert.alert("Error", "Could not load your avatar gallery.");
      })
      .finally(() => {
        setLoading(false);
        // Animate collection entrance
        collectionOpacity.value = withTiming(1, { duration: 800 });
        collectionScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      });
  }, [profile]);

  // Animate create button
  useEffect(() => {
    // Removed spinning animation for better UX
  }, []);

  // useEffect(() => {
  //   if (!pollingJobId) return;

  //   setIsPolling(true);

  //   const interval = setInterval(async () => {
  //     try {
  //       const status = await avatarUtils.checkAvatarStatus(pollingJobId);

  //       if (status === "complete" || status === "error") {
  //         clearInterval(interval);
  //         setIsPolling(false);
  //         setPollingJobId(null);

  //         if (status === "complete") {
  //           triggerHaptic("medium");
  //           Alert.alert(
  //             "🎉 Success!",
  //             "Your new avatar is ready to join the collection!"
  //           );

  //           await Promise.all([
  //             avatarUtils.getMyAvatarsWithSignedUrls().then((data) => {
  //               setAvatars(
  //                 (data || [])
  //                   .filter((item) => item.path)
  //                   .map(({ path, signedUrl }) => ({
  //                     path: path as string,
  //                     signedUrl,
  //                   }))
  //               );
  //             }),
  //             refetchProfileAndData(),
  //           ]);
  //         } else {
  //           Alert.alert("Error", "Avatar generation failed. Please try again.");
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Polling error:", error);
  //       clearInterval(interval);
  //       setIsPolling(false);
  //       setPollingJobId(null);
  //     }
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, [pollingJobId]);

  const getCooldownText = () => {
    if (!profile?.last_avatar_created_at) return "";
    const lastDate = new Date(profile.last_avatar_created_at);
    const releaseDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffSeconds = (releaseDate.getTime() - now.getTime()) / 1000;
    if (diffSeconds <= 0) return "";
    const days = Math.floor(diffSeconds / (3600 * 24));
    const hours = Math.floor((diffSeconds % (3600 * 24)) / 3600);
    if (days > 0) return `Next avatar in ${days}d ${hours}h`;
    return `Next avatar in ${hours}h`;
  };

  const handleCreateFlow = async (style: { name: string; prompt: string }) => {
    setShowStyleSelector(false);
    triggerHaptic("medium");

    Alert.alert("Choose Photo", "How would you like to get your photo?", [
      {
        text: "Take Photo",
        onPress: async () => {
          try {
            const { status } =
              await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission needed",
                "Camera permission is required."
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await createAvatarWithImage(result.assets[0].uri, style);
            }
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to pick image");
          }
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          try {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission needed",
                "Media library permission is required."
              );
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await createAvatarWithImage(result.assets[0].uri, style);
            }
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to pick image");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const createAvatarWithImage = async (
    imageUri: string,
    style: { name: string; prompt: string }
  ) => {
    setIsCreating(true);
    triggerHaptic("heavy");

    if (profile?.subscription_status === "free" && paywallActive) {
      router.push({
        pathname: "/(modals)/PaywallScreen",
      });
      setIsCreating(false);
      return;
    }

    try {
      const response = await avatarUtils.createAvatar(imageUri, style);
      if (response && response.job_id) {
        await addPendingAvatar(response.job_id);
        Alert.alert(
          "Creation in Progress",
          "Your new avatar is being created in the background. We'll alert you when it's ready!"
        );
        //setPollingJobId(response.job_id);
      } else {
        throw new Error("Failed to initialize the avatar generation job.");
      }
    } catch (e: any) {
      Alert.alert(
        "Creation Failed",
        e.message || "An unexpected error occurred."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleAvatarPress = (item: { path: string; signedUrl: string }) => {
    triggerHaptic("light");
    Alert.alert("🎭 Manage Avatar", "What would you like to do?", [
      {
        text: "Set as Display Picture",
        onPress: async () => {
          try {
            await updateProfile({ display_avatar_path: item.path });
            triggerHaptic("medium");
            Alert.alert("✨ Success", "Your profile picture has been updated!");
          } catch (error) {
            Alert.alert("Error", "Could not update your profile picture.");
          }
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Are you sure?", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete It",
              style: "destructive",
              onPress: async () => {
                try {
                  await avatarUtils.deleteAvatar(item.path);
                  setAvatars((prev) =>
                    prev.filter((a) => a.path !== item.path)
                  );
                  triggerHaptic("medium");
                } catch (error: any) {
                  Alert.alert("Error", error.message);
                }
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleCreatePress = () => {
    triggerHaptic("medium");
    createButtonScale.value = withSpring(0.95, { damping: 15, stiffness: 100 });
    setTimeout(() => {
      createButtonScale.value = withSpring(1, { damping: 15, stiffness: 100 });
      setShowStyleSelector(true);
    }, 150);
  };

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const animatedCreateButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
  }));

  const animatedCollectionStyle = useAnimatedStyle(() => ({
    opacity: collectionOpacity.value,
    transform: [{ scale: collectionScale.value }],
  }));

  if (loading) {
    return (
      <LinearGradient
        colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
        locations={[0, 0.4, 0.8, 1]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E0B0FF" />
          <Text style={styles.loadingText}>
            Loading your avatar collection...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const isProcessingAvatars = pendingAvatars.length > 0;
  const maxConcurrentCreations = 1;

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#2d1b69", "#000"]}
      locations={[0, 0.4, 0.8, 1]}
      style={styles.container}
    >
      {/* Enhanced Header */}
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            triggerHaptic("light");
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🎭 Avatar Studio</Text>
          <Text style={styles.headerSubtitle}>
            Collect your dream characters
          </Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.avatarCount}>{avatars.length}</Text>
          <Text style={styles.avatarLabel}>avatars</Text>
        </View>
      </Animated.View>

      {/* Enhanced Collection */}
      <Animated.View
        style={[styles.collectionContainer, animatedCollectionStyle]}
      >
        <Text style={styles.collectionTitle}>Your Collection</Text>

        {avatars.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-circle-outline" size={80} color="#E0B0FF" />
            <Text style={styles.emptyTitle}>No avatars yet!</Text>
            <Text style={styles.emptySubtitle}>
              Create your first avatar to start your collection
            </Text>
          </View>
        ) : (
          <FlatList
            data={avatars}
            renderItem={({ item, index }) => (
              <AnimatedPressable
                style={[styles.avatarWrapper, { animationDelay: index * 100 }]}
                onPress={() => handleAvatarPress(item)}
                onPressIn={() => {
                  triggerHaptic("light");
                }}
              >
                <View style={styles.avatarContainer}>
                  <Avatar
                    avatarUrl={item.signedUrl}
                    size={getResponsiveValue(100, 140)}
                  />
                  {profile?.display_avatar_path === item.path && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#E0B0FF"
                      />
                    </View>
                  )}
                </View>
              </AnimatedPressable>
            )}
            keyExtractor={(item) => item.path}
            numColumns={3}
            contentContainerStyle={styles.galleryContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* Enhanced Create Button */}
      <View style={styles.buttonContainer}>
        {/* MODIFIED: Updated button logic for clearer states */}
        {isCreating ? (
          // State 1: Actively picking photo/style
          <View style={styles.loadingState}>
            <ActivityIndicator color="#E0B0FF" size="large" />
            <Text style={styles.loadingStateText}>Sending to studio...</Text>
          </View>
        ) : isProcessingAvatars ? (
          // State 2: Job is processing in the background
          <View style={styles.loadingState}>
            <ActivityIndicator color="#E0B0FF" size="large" />
            <Text style={styles.loadingStateText}>
              {`Creating ${pendingAvatars.length} avatar(s)...`}
            </Text>
          </View>
        ) : isCooldownActive() ? (
          // State 3: Last creation was recent, now in cooldown
          <View style={styles.cooldownContainer}>
            <Ionicons name="time-outline" size={24} color="#E0B0FF" />
            <Text style={styles.cooldownText}>{getCooldownText()}</Text>
          </View>
        ) : (
          // State 4: Ready to create
          <AnimatedPressable
            style={[styles.createButton, animatedCreateButtonStyle]}
            onPress={handleCreatePress}
            // Future-proofing for tiers: disable if processing queue is full
            disabled={pendingAvatars.length >= maxConcurrentCreations}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create New Avatar</Text>
          </AnimatedPressable>
        )}
      </View>

      <Modal
        visible={showStyleSelector}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalView}>
          <StyleSelector
            onStyleSelect={handleCreateFlow}
            mode="creation"
            onClose={() => {
              triggerHaptic("light");
              setShowStyleSelector(false);
            }}
          />
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#E0B0FF",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#E0B0FF",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "500",
  },
  headerStats: {
    alignItems: "center",
  },
  avatarCount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#E0B0FF",
  },
  avatarLabel: {
    fontSize: 12,
    color: "#B0B0B0",
    fontWeight: "500",
  },
  collectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  collectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E0B0FF",
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  galleryContainer: {
    paddingBottom: 20,
  },
  avatarWrapper: {
    flex: 1,
    alignItems: "center",
    margin: 8,
  },
  avatarContainer: {
    position: "relative",
    alignItems: "center",
  },
  processingText: {
    color: "#E0B0FF",
    fontSize: 14,
    marginTop: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  selectedIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    padding: 2,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(224,176,255,0.2)",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(224,176,255,0.4)",
    shadowColor: "#E0B0FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingStateText: {
    color: "#E0B0FF",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "600",
  },
  cooldownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(224,176,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(224,176,255,0.3)",
    gap: 8,
  },
  cooldownText: {
    color: "#E0B0FF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalView: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
