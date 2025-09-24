import React, { useState, useEffect, useCallback } from "react";

import { Stack, useRouter } from "expo-router";
import { Platform, View } from "react-native";
import { UserProvider, useUser } from "@/context/UserContext";
import Purchases from "react-native-purchases";
import paywallActive from "../context/PaywallContext";

import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { InitialLoadingScreen } from "@/components/InitialLoadingScreen";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const BACKGROUND_FETCH_TASK = "comic-status-fetch";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const now = new Date();

  console.log(
    `[${now.toISOString()}] Background task '${BACKGROUND_FETCH_TASK}' running`
  );

  try {
    const storedComics = await AsyncStorage.getItem("pendingComics");
    const pendingComics = storedComics ? JSON.parse(storedComics) : [];

    if (pendingComics.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let hasCompletedComics = false;
    const remainingComics = [...pendingComics];

    for (const dreamId of pendingComics) {
      const res = await fetch(
        `https://dreamtoon.onrender.com/comic-status/${dreamId}`
      );

      const data = await res.json();

      if (data.status === "complete") {
        hasCompletedComics = true;

        const index = remainingComics.indexOf(dreamId);
        if (index > -1) {
          remainingComics.splice(index, 1);
        }

        //Send a notification to the user
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Your Comic is Ready!",
            body: "Tap to view your new creation.",
            data: { dream_id: dreamId, url: data.panel_urls[0] },
          },
          trigger: null, //this sends immmediately
        });
      } else if (data.status === "error") {
        const index = remainingComics.indexOf(dreamId);
        if (index > -1) {
          remainingComics.splice(index, 1);
        }
      }
    }

    await AsyncStorage.setItem(
      "pendingComics",
      JSON.stringify(remainingComics)
    );

    return hasCompletedComics
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Background fetch task failed:", error);
    BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 3 * 60, //5 min
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

function RootNavigationController() {
  const { session, loading } = useUser();
  const router = useRouter();

  const onLayoutRootView = useCallback(async () => {
    if (loading === false) {
      // This hides the splash screen once we are done loading.
      await SplashScreen.hideAsync();
    }
  }, [loading]);

  useEffect(() => {
    // Wait until the loading is finished before doing anything.
    if (loading) {
      return;
    }

    if (!session) {
      router.replace("/(auth)/WelcomeScreen");
    }

    // If there IS a session, the user will be on the default screen ('index.tsx' by default),
    // which should redirect them to the main app. We will fix that in the next step.
  }, [session, loading]);

  // If loading, show the initial loading screen.
  if (loading) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    registerBackgroundFetchAsync();
    // Your RevenueCat configuration can also go here.
    if (Platform.OS === "ios") {
      const revenuecatKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
      if (revenuecatKey) {
        Purchases.configure({ apiKey: revenuecatKey });
      }
    }
  }, []);
  return (
    <UserProvider>
      <RootNavigationController />
    </UserProvider>
  );
}
