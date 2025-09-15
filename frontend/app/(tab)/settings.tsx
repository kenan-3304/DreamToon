import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  Linking,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../utils/supabase";
import { Avatar } from "../../components/Avatar";
import { ScreenLayout } from "@/components/ScreenLayout";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import * as Notifications from "expo-notifications";
import { ensureNotificationPermissions } from "../../utils/permissions";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const { user, profile, logout, updateProfile } = useUser();
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newName, setNewName] = useState(profile?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<Notifications.PermissionStatus | null>(null);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationStatus(status);
  };

  // Animation values
  const modalScale = useSharedValue(0);
  const modalOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(1);

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

  const handleLogout = async () => {
    triggerHaptic("medium");
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            await logout();
            router.replace("/(auth)/AuthScreen");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    triggerHaptic("heavy");
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your comics and data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              if (!user?.id) {
                Alert.alert(
                  "Error",
                  "User not found. Please try logging in again."
                );
                return;
              }

              const { data, error } = await supabase.functions.invoke(
                "delete_user",
                {
                  body: { user_id: user.id },
                }
              );

              await logout();
              router.replace("/(auth)/AuthScreen");
            } catch (error) {
              console.error("Delete account error:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleGoPremium = () => {
    triggerHaptic("light");
    router.push("/PaywallScreen");
  };

  const handleManageSubscription = () => {
    triggerHaptic("light");
    Linking.openURL("https://apps.apple.com/account/subscriptions");
  };

  const handleNotificationsPress = async () => {
    await ensureNotificationPermissions();
    // Re-check the status to update the UI after the user interacts with the prompt
    checkNotificationStatus();
  };

  const handleOptionPress = (onPress: () => void, isDestructive = false) => {
    triggerHaptic(isDestructive ? "medium" : "light");
    onPress();
  };

  const openEditNameModal = () => {
    setNewName(profile?.name || "");
    setShowEditNameModal(true);
    modalScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    modalOpacity.value = withTiming(1, { duration: 200 });
  };

  const closeEditNameModal = () => {
    modalScale.value = withSpring(0, { damping: 15, stiffness: 100 });
    modalOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setShowEditNameModal)(false);
    });
  };

  const settingsOptions = [
    {
      icon: <Ionicons name="person" size={24} color="#E0B0FF" />,
      title: "Profile",
      subtitle: profile?.name || "Update your profile",
      onPress: () => handleOptionPress(openEditNameModal),
      color: "#E0B0FF",
    },
    {
      icon: <Ionicons name="brush" size={24} color="#4ECDC4" />,
      title: "Comic Avatar",
      subtitle: profile?.display_avatar_path
        ? "Update and view your comic avatar"
        : "Create your comic avatar",
      onPress: () =>
        handleOptionPress(() =>
          router.push({ pathname: "/(tab)/AvatarStudioScreen" })
        ),
      color: "#4ECDC4",
    },

    ...(profile?.subscription_status === "free"
      ? [
          {
            icon: <Ionicons name="sparkles" size={24} color="#FFD93D" />,
            title: "Go Premium",
            subtitle: "Unlock all features & create unlimited comics",
            onPress: () => handleOptionPress(handleGoPremium),
            color: "#FFD93D",
            isPremium: true, // Custom flag for special styling
          },
        ]
      : [
          {
            icon: <Ionicons name="card" size={24} color="#7F9CF5" />,
            title: "Manage Subscription",
            subtitle: "View or cancel your subscription",
            onPress: () => handleOptionPress(handleManageSubscription),
            color: "#7F9CF5",
          },
        ]),
    {
      icon: <Ionicons name="notifications" size={24} color="#34D399" />,
      title: "Notifications",
      subtitle:
        notificationStatus === "granted"
          ? "Enabled"
          : "Disabled, tap to enable",
      onPress: () => handleOptionPress(handleNotificationsPress),
      color: "#34D399",
    },
    {
      icon: <Ionicons name="information-circle" size={24} color="#FFD93D" />,
      title: "About",
      subtitle: "App version and info",
      onPress: () =>
        handleOptionPress(() => {
          Alert.alert(
            "DreamToon",
            "Version 1.0.1\n\nTurn your dreams into comics!\n\nCreated with ❤️ for dreamers everywhere."
          );
        }),
      color: "#FFD93D",
    },
    {
      icon: <Ionicons name="trash" size={24} color="#FF6B6B" />,
      title: "Delete Account",
      subtitle: "Permanently remove your account",
      onPress: () => handleOptionPress(handleDeleteAccount, true),
      color: "#FF6B6B",
      isDestructive: true,
    },
  ];

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  return (
    <ScreenLayout>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E0B0FF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enhanced User Info Section */}
        <View style={styles.userSection}>
          <Animated.View style={[styles.userAvatar, avatarAnimatedStyle]}>
            {profile?.display_avatar_path ? (
              <Avatar avatarUrl={profile.display_avatar_path} size={130} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={60} color="#E0B0FF" />
              </View>
            )}
          </Animated.View>
          <Text style={styles.userName}>{profile?.name || "Dreamer"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          <View style={styles.subscriptionBadge}>
            <Ionicons
              name={
                profile?.subscription_status === "free"
                  ? "star-outline"
                  : "star"
              }
              size={16}
              color={
                profile?.subscription_status === "free" ? "#FFD93D" : "#FFD93D"
              }
            />
            <Text style={styles.subscriptionText}>
              {profile?.subscription_status === "free"
                ? "Free Plan"
                : "Premium Plan"}
            </Text>
          </View>
        </View>

        {/* Enhanced Settings Options */}
        <View style={styles.optionsContainer}>
          {settingsOptions.map((option, index) => (
            <AnimatedPressable
              key={index}
              style={[
                styles.optionItem,
                option.isDestructive && styles.destructiveOption,
              ]}
              onPress={option.onPress}
              onPressIn={() => {
                avatarScale.value = withSpring(0.95, {
                  damping: 15,
                  stiffness: 100,
                });
              }}
              onPressOut={() => {
                avatarScale.value = withSpring(1, {
                  damping: 15,
                  stiffness: 100,
                });
              }}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: `${option.color}20` },
                ]}
              >
                {option.icon}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </AnimatedPressable>
          ))}
        </View>

        {/* Enhanced Logout Button */}
        <AnimatedPressable
          style={styles.logoutButton}
          onPress={handleLogout}
          onPressIn={() => {
            avatarScale.value = withSpring(0.95, {
              damping: 15,
              stiffness: 100,
            });
          }}
          onPressOut={() => {
            avatarScale.value = withSpring(1, { damping: 15, stiffness: 100 });
          }}
        >
          <Ionicons name="log-out" size={24} color="#FF6B6B" />
          <Text style={styles.logoutText}>Logout</Text>
        </AnimatedPressable>
      </ScrollView>

      {/* Enhanced Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="none"
        transparent
        onRequestClose={closeEditNameModal}
      >
        <Animated.View style={[styles.modalOverlay, modalAnimatedStyle]}>
          <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={closeEditNameModal}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your name"
              placeholderTextColor="#666"
              style={styles.nameInput}
              autoFocus
              maxLength={30}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEditNameModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (!newName.trim() || savingName) && styles.disabledButton,
                ]}
                disabled={!newName.trim() || savingName}
                onPress={async () => {
                  if (!newName.trim()) return;
                  setSavingName(true);
                  try {
                    await updateProfile({ name: newName.trim() });
                    closeEditNameModal();
                    triggerHaptic("light");
                  } catch (e) {
                    Alert.alert(
                      "Error",
                      "Failed to update name. Please try again."
                    );
                  } finally {
                    setSavingName(false);
                  }
                }}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    color: "#E0B0FF",
    fontSize: 16,
    marginTop: 10,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Add bottom padding to ensure logout button is visible
  },
  userSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 30,
  },
  userAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(224,176,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#E0B0FF",
    shadowColor: "#E0B0FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  defaultAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(224,176,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#B0B0B0",
    marginBottom: 15,
  },
  subscriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,217,61,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,217,61,0.3)",
  },
  subscriptionText: {
    color: "#FFD93D",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  destructiveOption: {
    borderColor: "rgba(255,107,107,0.3)",
    backgroundColor: "rgba(255,107,107,0.05)",
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#B0B0B0",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
    marginBottom: 80, // Increased from 40 to 80 for more space
    shadowColor: "rgba(255,107,107,0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF6B6B",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1a1333",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  nameInput: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  saveButton: {
    backgroundColor: "#E0B0FF",
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default SettingsScreen;
