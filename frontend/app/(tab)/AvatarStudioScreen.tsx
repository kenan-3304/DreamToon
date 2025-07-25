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

export default function AvatarStudioScreen() {
  const router = useRouter(); // --- ADD: Router for navigation ---
  const { profile, refetchProfileAndData } = useUser();
  const [avatars, setAvatars] = useState<{ path: string; signedUrl: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);

  useEffect(() => {
    // Note: I've updated this to use the better function from my previous advice
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

  const isCooldownActive = () => {
    // ... (your existing cooldown logic is correct) ...
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
    try {
      await avatarUtils.createAvatar(imageUri, style);
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
        refetchProfileAndData(),
      ]);
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
          <View style={styles.avatarWrapper}>
            <Avatar avatarUrl={item.signedUrl} size={100} />
          </View>
        )}
        keyExtractor={(item) => item.path} // Using path for a stable key
        numColumns={3}
        contentContainerStyle={styles.galleryContainer}
        ListFooterComponent={
          <View style={styles.buttonContainer}>
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : isCooldownActive() ? (
              <Text style={styles.cooldownText}>{getCooldownText()}</Text>
            ) : (
              <Pressable
                style={styles.createButton}
                onPress={() => setShowStyleSelector(true)}
              >
                <Text style={styles.createButtonText}>Create New Avatar</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <Modal visible={showStyleSelector} animationType="slide">
        {/* You will likely want to style your StyleSelector and Modal view as well */}
        <View style={styles.modalView}>
          <StyleSelector onStyleSelect={handleCreateFlow} mode="creation" />
          <Button title="Cancel" onPress={() => setShowStyleSelector(false)} />
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
    backgroundColor: "#0D0A3C",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
});
