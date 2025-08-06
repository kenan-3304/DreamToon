import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  Linking, // <-- Add Linking import
  TextInput,
  Platform, // <-- Add Platform import
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../utils/supabase";
import { Avatar } from "../../components/Avatar";
import { rgbaArrayToRGBAColor } from "react-native-reanimated/lib/typescript/Colors";

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const { user, profile, logout, updateProfile } = useUser();
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newName, setNewName] = useState(profile?.name || "");
  const [savingName, setSavingName] = useState(false);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/(auth)/AuthScreen");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.id) {
                Alert.alert(
                  "Error",
                  "User not found. Please try logging in again."
                );
                return;
              }

              // Call your backend function here
              const { data, error } = await supabase.functions.invoke(
                "delete_user",
                {
                  body: { user_id: user.id },
                }
              );

              if (error) {
                console.error("Delete account error:", error);
                Alert.alert(
                  "Error",
                  error.message || "Failed to delete account."
                );
              } else {
                // Success - logout and redirect
                await logout();
                router.replace("/(auth)/AuthScreen");
              }
            } catch (error) {
              console.error("Delete account error:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    Linking.openURL("https://apps.apple.com/account/subscriptions");
  };

  const settingsOptions = [
    {
      icon: <Ionicons name="person" size={24} color="#00EAFF" />,
      title: "Profile",
      subtitle: profile?.name || "Update your profile",
      onPress: () => {
        setNewName(profile?.name || "");
        setShowEditNameModal(true);
      },
    },
    {
      icon: <Ionicons name="brush" size={24} color="#00EAFF" />,
      title: "Comic Avatar",
      subtitle: profile?.display_avatar_path
        ? "Update your comic avatar"
        : "Create your comic avatar",
      onPress: () => {
        router.push({ pathname: "/(tab)/AvatarStudioScreen" });
      },
    },
    {
      icon: <Ionicons name="card" size={24} color="#00EAFF" />, // Use a card icon for subscription
      title: "Manage Subscription",
      subtitle: "View or cancel your subscription",
      onPress: handleManageSubscription,
    },
    {
      icon: <Ionicons name="information-circle" size={24} color="#00EAFF" />,
      title: "About",
      subtitle: "App version and info",
      onPress: () => {
        Alert.alert(
          "DreamToon",
          "Version 1.0.1\n\nTurn your dreams into comics!"
        );
      },
    },
    {
      icon: <Ionicons name="trash" size={24} color="#FF4444" />,
      title: "Delete Account",
      subtitle: "Permanently remove your account",
      onPress: handleDeleteAccount,
    },
  ];

  return (
    <LinearGradient colors={["#492D81", "#000"]} style={styles.container}>
      {/* Add this spacer */}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            {profile?.display_avatar_path ? (
              <Avatar avatarUrl={profile.display_avatar_path} size={130} />
            ) : (
              <Ionicons name="person" size={60} color="#00EAFF" />
            )}
          </View>
          <Text style={styles.userName}>{profile?.name || "Dreamer"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
        </View>

        {/* Settings Options */}
        <View style={styles.optionsContainer}>
          {settingsOptions.map((option, index) => (
            <Pressable
              key={index}
              style={styles.optionItem}
              onPress={option.onPress}
            >
              <View style={styles.optionIcon}>{option.icon}</View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#FF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#1a1333",
              borderRadius: 20,
              padding: 24,
              width: "85%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 16,
              }}
            >
              Edit Name
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your name"
              placeholderTextColor="#aaa"
              style={{
                width: "100%",
                backgroundColor: "#2a2250",
                color: "#fff",
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#8D79F0",
              }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                style={{
                  backgroundColor: "#8D79F0",
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  marginRight: 8,
                  opacity: savingName ? 0.7 : 1,
                }}
                disabled={savingName}
                onPress={async () => {
                  if (!newName.trim()) return;
                  setSavingName(true);
                  try {
                    await updateProfile({ name: newName.trim() });
                    setShowEditNameModal(false);
                  } catch (e) {
                    Alert.alert("Error", "Failed to update name.");
                  } finally {
                    setSavingName(false);
                  }
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}
                >
                  Save
                </Text>
              </Pressable>
              <Pressable
                style={{
                  backgroundColor: "#333",
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                }}
                onPress={() => setShowEditNameModal(false)}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Add fixed top padding
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    // marginLeft: 20, // Remove marginLeft for true centering
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 1, // Add fixed top padding
  },
  userSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 30,
  },
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,234,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#00EAFF",
    // Shadow for iOS
    shadowColor: "rgb(0, 0, 0)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    // Shadow for Android
    elevation: 8,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#a7a7a7",
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#8D79F0",
    backgroundColor: "rgba(90, 44, 150, 0.31)",
    // Shadow for iOS
    shadowColor: "rgba(91, 55, 223, 0.31)",
    shadowOffset: { width: 1, height: -12 },
    shadowOpacity: 1,
    shadowRadius: 17.7,
    // Shadow for Android
    elevation: 8,
  },
  optionIcon: {
    width: 50,
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
    marginLeft: 10,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#a7a7a7",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    backgroundColor: "rgba(255,68,68,0.1)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.3)",
    marginBottom: 40,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF4444",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#0D0A3C",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 20,
  },
});

export default SettingsScreen;
