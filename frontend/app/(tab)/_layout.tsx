import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { UserProvider } from "../../context/UserContext";

export default function TabLayout() {
  return (
    <UserProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#00EAFF",
          tabBarInactiveTintColor: "#a7a7a7",
          tabBarStyle: {
            backgroundColor: "rgba(13,10,60,0.8)",
            borderTopColor: "rgba(0,234,255,0.2)",
          },
        }}
      >
        <Tabs.Screen
          name="EnhancedDashboardScreen"
          options={{
            title: "Home",
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="TimelineScreen"
          options={{
            title: "Timeline",
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="SettingScreen"
          options={{
            title: "Settings",
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="ProcessingScreen"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="ComicResultScreen"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="CreateToonScreen"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        />

        <Tabs.Screen
          name="AvatarStudioScreen"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        />
      </Tabs>
    </UserProvider>
  );
}
