import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../utils/supabase"; // Adjust path to your supabase client
import { Session, User } from "@supabase/supabase-js";
import { View } from "react-native";

//this is current shape of the profile data
interface Profile {
  id: string;
  name?: string;
  character_design?: string;
  avatar_url?: string;
  original_photo_url?: string;
  //other profile fields can be added here
}

//this is the shape of the context value
interface UserContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (updates: {
    //updare profile fields
    name?: string;
    character_design?: string;
    avatar_url?: string;
    original_photo_url?: string;
  }) => Promise<void>;
}

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Create the Provider component
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      }
      setLoading(false);
    };

    fetchSession();

    // Listen for changes in authentication state (login, logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        // If no profile exists, create one
        if (error.code === "PGRST116") {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert([
              {
                id: user.id,
                name: user.email?.split("@")[0] || "Dreamer",
                character_design: "",
              },
            ])
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
          } else {
            setProfile(newProfile);
          }
        } else {
          console.error("Error fetching profile:", error);
        }
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const updateProfile = async (updates: {
    name?: string;
    character_design?: string;
    avatar_url?: string;
    original_photo_url?: string;
  }) => {
    if (!user) throw new Error("No user is logged in to update profile.");
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) throw error;
      // After updating, fetch the latest profile data to refresh the UI
      await fetchProfile(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    loading,
    logout,
    updateProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: "#0D0A3C" }} />
      ) : (
        children
      )}
    </UserContext.Provider>
  );
};

// Create the custom hook to use the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
