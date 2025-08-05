import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "../utils/supabase";
import { Session, User } from "@supabase/supabase-js";
import { View, ActivityIndicator } from "react-native";

//sets up the profile interface
interface Profile {
  id: string;
  name?: string;
  character_design?: string;
  avatar_url?: string;
  original_photo_url?: string;
  subscription_status?: "free" | "trial" | "active" | "cancelled";
  last_avatar_created_at?: string;
  display_avatar_path?: string;
  daily_creation_count?: number;
  last_creation_date?: Date;
}

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  unlockedStyles: string[];
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refetchProfileAndData: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlockedStyles, setUnlockedStyles] = useState<string[]>([]);

  //handle auth changes and initial load
  useEffect(() => {
    //Listen for any auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        //if there is a login fetch the profile if there is log out clear it
        if (currentUser) {
          fetchProfile(currentUser);
        } else {
          setProfile(null);
          setUnlockedStyles([]);
        }
        setLoading(false); // <-- MOVE THIS HERE
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (user: User) => {
    try {
      // Run fetches in parallel
      const [profileResult, stylesResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("unlocked_styles").select("style").eq("user_id", user.id),
      ]);

      // Handle styles
      if (stylesResult.data) {
        setUnlockedStyles(stylesResult.data.map((s) => s.style));
      } else if (stylesResult.error) {
        throw stylesResult.error; // Rethrow style fetch error
      }

      // Handle profile
      if (profileResult.data) {
        setProfile(profileResult.data);
      } else if (
        profileResult.error &&
        profileResult.error.code === "PGRST116"
      ) {
        // Profile not found, create it
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            name: user.email?.split("@")[0] || "Dreamer",
            subscription_status: "free",
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else if (profileResult.error) {
        throw profileResult.error; // Rethrow other profile errors
      }
    } catch (error) {
      console.log("Error fetching user data:", error);
      // Reset states on error
      setProfile(null);
      setUnlockedStyles([]);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error("No User logged in.");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...updates, id: user.id })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      //now update the profile
      setProfile(data);
    } catch (error) {
      console.log("Error updating profile:", error);
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
    unlockedStyles,
    refetchProfileAndData: () => {
      if (user) {
        fetchProfile(user);
      }
    },
  };

  //loading screen while initial session is being fetched
  return (
    <UserContext.Provider value={value}>
      {loading ? (
        // Give the user feedback while loading
        <View
          style={{
            flex: 1,
            backgroundColor: "#0D0A3C",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#00EAFF" />
        </View>
      ) : (
        children
      )}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context == undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
