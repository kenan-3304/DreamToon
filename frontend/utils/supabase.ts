import "react-native-url-polyfill/auto"; // Required for Supabase to work in React Native
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lzrhocmfiulykdxjzaku.supabase.co"; // Paste your Project URL here
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cmhvY21maXVseWtkeGp6YWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjA0NjIsImV4cCI6MjA2NDI5NjQ2Mn0.nsHFSWVuS-j73YwQztvA3SY6cUuA7CqWLoECXwFTwIM"; // Paste your Anon Key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
