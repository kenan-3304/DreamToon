import { useState } from "react";
import { supabase } from "@/utils/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Alert } from "react-native";

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- NATIVE GOOGLE SIGN-IN (No changes needed) ---
  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      GoogleSignin.configure({
        webClientId:
          "1075347854434-0a2vo62h1e32jr9o3dfbq8gap0r2ooij.apps.googleusercontent.com",
        iosClientId:
          "1075347854434-7rmoljgc77itobhjoi18ukgdfg57g690.apps.googleusercontent.com",
      });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.data?.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });
        if (error) throw error;
      } else {
        throw new Error("Google sign-in failed: No ID token present!");
      }
    } catch (e: any) {
      if (e.code !== statusCodes.SIGN_IN_CANCELLED) {
        setError(e.message);
        console.error("Google Sign-In Error:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- EMAIL OTP SIGN-UP / SIGN-IN (No changes needed) ---
  const signUpWithEmailOtp = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // --- VERIFY EMAIL OTP (No changes needed) ---
  const verifyOtp = async (email: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: "email",
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // The signInWithEmail function has been removed.

  return {
    loading,
    error,
    signInWithGoogle,
    signUpWithEmailOtp,
    verifyOtp,
  };
}
