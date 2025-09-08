import { useState } from "react";
import { supabase } from "@/utils/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import appleAuth from "@invertase/react-native-apple-authentication";
import { Alert } from "react-native";
import * as Crypto from "expo-crypto";

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Performs Apple Sign-In and authenticates with Supabase.
   * Throws an error on failure.
   */
  const signInWithApple = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add the recommended check to ensure Apple Auth is supported.
      if (!appleAuth.isSupported) {
        throw new Error(
          "Apple Authentication is not supported on this device."
        );
      }
      const rawNonce = Crypto.randomUUID();

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      // Start the Apple sign-in request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        nonce: hashedNonce,
      });

      // Get the identity token from the response
      const { identityToken } = appleAuthRequestResponse;

      if (identityToken) {
        // Sign in with Supabase using the identity token
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: identityToken,
          nonce: hashedNonce,
        });

        if (error) {
          throw error; // Throw Supabase error
        }
      } else {
        throw new Error("Apple sign-in failed: No identity token received.");
      }
    } catch (e: any) {
      setError(e.message);
      throw e; // Re-throw the error to be caught in the UI component
    } finally {
      setLoading(false);
    }
  };

  /**
   * Performs Google Sign-In and authenticates with Supabase.
   * Throws an error on failure.
   */
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
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });
        if (error) throw error;
      } else {
        throw new Error("Google sign-in failed: No ID token present!");
      }
    } catch (e: any) {
      setError(e.message);
      throw e; // Re-throw the error to be caught in the UI component
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sends a one-time password (OTP) to the user's email.
   */
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

  /**
   * Verifies the OTP sent to the user's email.
   */
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

  return {
    loading,
    error,
    signInWithApple,
    signInWithGoogle,
    signUpWithEmailOtp,
    verifyOtp,
  };
}
