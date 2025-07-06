import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../utils/supabase";

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const { user, profile, logout } = useUser();

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

  const settingsOptions = [
    {
      icon: <Ionicons name="person" size={24} color="#00EAFF" />,
      title: "Profile",
      subtitle: profile?.name || "Update your profile",
      onPress: () => {
        // Navigate to profile edit screen
        Alert.alert("Coming Soon", "Profile editing will be available soon!");
      },
    },
    {
      icon: <Ionicons name="brush" size={24} color="#00EAFF" />,
      title: "Character Design",
      subtitle: profile?.character_design || "Customize your character",
      onPress: () => {
        // Navigate to character design screen
        Alert.alert(
          "Coming Soon",
          "Character customization will be available soon!"
        );
      },
    },
    {
      icon: <Ionicons name="information-circle" size={24} color="#00EAFF" />,
      title: "About",
      subtitle: "App version and info",
      onPress: () => {
        Alert.alert(
          "DreamToon",
          "Version 1.0.0\n\nTurn your dreams into comics!"
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
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000000"]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color="#00EAFF" />
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginLeft: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 30,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,234,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#00EAFF",
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
    backgroundColor: "rgba(13,10,60,0.9)",
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
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
});

export default SettingsScreen;
