import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase"; // Adjust this path if it's different
import { Session } from "@supabase/supabase-js";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { UserProvider } from "@/context/UserContext";
import Purchases from "react-native-purchases";
import paywallActive from "../context/PaywallContext";

import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

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
// Create a context to hold the session information
const AuthContext = React.createContext<{
  session: Session | null;
  loading: boolean;
}>({
  session: null,
  loading: true,
});

// This hook can be used to access the user session from anywhere in the app
export function useSession() {
  const value = React.useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useSession must be wrapped in a <SessionProvider />");
    }
  }
  return value;
}

// The SessionProvider component manages loading the session and listening for changes
function SessionProvider(props: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure RevenueCat
    if (paywallActive) {
      if (Platform.OS === "ios") {
        const revenuecatKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
        if (!revenuecatKey) throw new Error("RevenueCat Apple key is not set!");
        Purchases.configure({ apiKey: revenuecatKey });
      }
    }

    // Fetch the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {props.children}
    </AuthContext.Provider>
  );
}

// The root layout component is now a simple container.
// It provides the session and the Stack navigator, but does NO redirection.
export default function RootLayout() {
  useEffect(() => {
    registerBackgroundFetchAsync();
  }, []);
  return (
    <SessionProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </UserProvider>
    </SessionProvider>
  );
}
