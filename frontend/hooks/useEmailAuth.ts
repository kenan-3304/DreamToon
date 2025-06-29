import { useState } from "react";
import { supabase } from "@/utils/supabase"; // Adjust the import path as needed

export default function useEmailAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Create a new user account with Supabase */
  const signUp = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // Use supabase.auth.signUp instead of Firebase
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) throw error;
      // On success, Supabase sends a confirmation email (by default)
      // and the user is available in the session.
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /** Sign in an existing user with Supabase */
  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // Use supabase.auth.signInWithPassword instead of Firebase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, signUp, signIn };
}
