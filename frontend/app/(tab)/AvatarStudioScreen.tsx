import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Button,
  ActivityIndicator,
  Modal,
  Alert,
  StyleSheet,
  Pressable,
} from "react-native";
import { useUser } from "../../context/UserContext";
import { avatarUtils } from "../../utils/avatarUtils";
import { Avatar } from "../../components/Avatar";
import { StyleSelector } from "../../components/StyleSelector";
import * as ImagePicker from "expo-image-picker";
// --- ADD: Import necessary components for styling ---
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ShinyGradientButton } from "@/components/ShinyGradientButton";

export default function AvatarStudioScreen() {
  const router = useRouter(); // --- ADD: Router for navigation ---
  const { profile, refetchProfileAndData, updateProfile } = useUser();
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [avatars, setAvatars] = useState<{ path: string; signedUrl: string }[]>(
    []
  );

  const [isPolling, setIsPolling] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  useEffect(() => {
    avatarUtils
      .getMyAvatarsWithSignedUrls()
      .then((data) => {
        setAvatars(
          (data || [])
            .filter((item) => item.path) // remove nulls
            .map(({ path, signedUrl }) => ({ path: path as string, signedUrl }))
        );
      })
      .catch((err) => {
        Alert.alert("Error", "Could not load your avatar gallery.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // --- This entire useEffect hook manages the polling process ---
  useEffect(() => {
    if (!pollingJobId) return;

    setIsPolling(true);

    // Set up a timer to check the status every 5 seconds
    const interval = setInterval(async () => {
      try {
        const status = await avatarUtils.checkAvatarStatus(pollingJobId);

        // If the job is done (successfully or with an error), stop polling.
        if (status === "complete" || status === "error") {
          clearInterval(interval);
          setIsPolling(false);
          setPollingJobId(null);

          if (status === "complete") {
            Alert.alert("Success!", "Your new avatar is ready.");

            // --- CHANGE: Using Promise.all for more efficient data refreshing ---
            await Promise.all([
              avatarUtils.getMyAvatarsWithSignedUrls().then((data) => {
                setAvatars(
                  (data || [])
                    .filter((item) => item.path)
                    .map(({ path, signedUrl }) => ({
                      path: path as string,
                      signedUrl,
                    }))
                );
              }),
              refetchProfileAndData(), // Refreshes profile and cooldown timer
            ]);
            // --- END CHANGE ---
          } else {
            Alert.alert("Error", "Avatar generation failed. Please try again.");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
        setIsPolling(false);
        setPollingJobId(null);
      }
    }, 5000);

    // Clean up the timer if the user navigates away from the screen
    return () => clearInterval(interval);
  }, [pollingJobId]);

  const isCooldownActive = () => {
    if (!profile?.last_avatar_created_at) return false;
    const lastDate = new Date(profile.last_avatar_created_at);
    const now = new Date();
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 * 7;
  };

  const getCooldownText = () => {
    // ... (your existing cooldown text logic is correct) ...
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

    // Prompt user: Camera or Gallery
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

  // Helper to handle avatar creation and gallery refresh
  const createAvatarWithImage = async (
    imageUri: string,
    style: { name: string; prompt: string }
  ) => {
    setIsCreating(true);
    //check subscription status
    if (profile?.subscription_status === "free") {
      router.push({
        pathname: "/(modals)/PaywallScreen",
      });
      return;
    }
    try {
      const response = await avatarUtils.createAvatar(imageUri, style);
      if (response && response.job_id) {
        setPollingJobId(response.job_id);
      } else {
        throw new Error("Failed to initialize the avatart generation job.");
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

  if (loading) {
    return (
      <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
        <ActivityIndicator size="large" color="#00EAFF" />
      </LinearGradient>
    );
  }

  const handleAvatarPress = (item: { path: string; signedUrl: string }) => {
    Alert.alert("Manage Avatar", "What would you like to do?", [
      {
        text: "Set as Display Picture",
        onPress: async () => {
          try {
            await updateProfile({ display_avatar_path: item.path });
            Alert.alert("Success", "Your profile picture has been updated!");
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

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
      {/* --- ADD: Header for navigation --- */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Avatar Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={avatars}
        ListHeaderComponent={
          <Text style={styles.galleryTitle}>Your Collection</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.avatarWrapper}
            onPress={() => handleAvatarPress(item)}
          >
            <Avatar avatarUrl={item.signedUrl} size={100} />
            {profile?.display_avatar_path === item.path && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#00EAFF" />
              </View>
            )}
          </Pressable>
        )}
        keyExtractor={(item) => item.path} // Using path for a stable key
        numColumns={3}
        contentContainerStyle={styles.galleryContainer}
        ListFooterComponent={
          <View style={styles.buttonContainer}>
            {/* Update the button's loading state logic --- */}
            {isCreating || isPolling ? (
              <View style={{ alignItems: "center" }}>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <Text style={styles.cooldownText}>
                  {isPolling
                    ? "Generating your avatar..."
                    : "Sending to studio..."}
                </Text>
              </View>
            ) : isCooldownActive() ? (
              <Text style={styles.cooldownText}>{getCooldownText()}</Text>
            ) : (
              <ShinyGradientButton
                onPress={() => setShowStyleSelector(true)}
                disabled={loading}
              >
                Create New Avatar
              </ShinyGradientButton>
            )}
          </View>
        }
      />

      <Modal
        visible={showStyleSelector}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalView}>
          <StyleSelector
            onStyleSelect={handleCreateFlow}
            mode="creation"
            onClose={() => setShowStyleSelector(false)}
          />
        </View>
      </Modal>
    </LinearGradient>
  );
}

// --- ADD: StyleSheet for a clean look ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  galleryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  galleryContainer: {
    paddingHorizontal: 10,
  },
  avatarWrapper: {
    flex: 1,
    alignItems: "center",
    margin: 10,
  },
  buttonContainer: {
    margin: 20,
    marginTop: 40,
    alignItems: "center",
  },
  cooldownText: {
    color: "#a7a7a7",
    fontSize: 16,
    textAlign: "center",
  },
  createButton: {
    backgroundColor: "#00EAFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  createButtonText: {
    color: "#1a1333",
    fontSize: 16,
    fontWeight: "700",
  },
  modalView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
  },
});
