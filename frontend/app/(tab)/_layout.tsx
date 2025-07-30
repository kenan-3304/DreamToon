/*
================================================================================
File: app/(tab)/_layout.tsx
Description: A refined and production-ready implementation of the tab navigator.
The "pill" effect is now correctly applied ONLY to the active icon.
================================================================================
*/
import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { UserProvider } from "../../context/UserContext"; // Assuming path is correct
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useUser } from "../../context/UserContext";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <UserProvider>
      <TabContent />
    </UserProvider>
  );
}

function TabContent() {
  const { profile } = useUser();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#B0A8C0",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          height: 40 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        // FIX: Add tabBarItemStyle to control the vertical alignment of the buttons.
        tabBarItemStyle: {
          // By default, content is centered. We change it to align to the top.
          justifyContent: "flex-start",
          // Now you can use paddingTop to push the icons down precisely.
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={[
              "rgba(40, 40, 40, 0.22)", // Top color
              "rgba(0, 0, 0, 0.41)", // Bottom color
            ]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
      }}
    >
      {/* Tab 1: Settings Screen (Left) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              {profile?.display_avatar_path ? (
                <Avatar avatarUrl={profile.display_avatar_path} size={27} />
              ) : (
                <Ionicons
                  name={focused ? "settings" : "settings-outline"}
                  size={24}
                  color={color}
                />
              )}
            </View>
          ),
        }}
      />

      {/* Tab 2: Home Screen (Middle) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Tab 3: Timeline Screen (Right) */}
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ focused, color, size }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <Ionicons
                name={focused ? "time" : "time-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* --- Hidden Screens --- */}
      <Tabs.Screen
        name="ProcessingScreen"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="ComicResultScreen"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="CreateToonScreen"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="AvatarStudioScreen"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // The activeIconContainer no longer needs the transform property
  activeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22, // Perfect circle
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
