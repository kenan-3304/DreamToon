import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase"; // Adjust this path if it's different
import { Session } from "@supabase/supabase-js";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

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
    if (Platform.OS === "ios") {
      const revenuecatKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
      if (!revenuecatKey) throw new Error("RevenueCat Apple key is not set!");
      Purchases.configure({ apiKey: revenuecatKey });
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
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
