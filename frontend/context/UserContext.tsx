import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  ReactNode,
} from "react";
import { supabase } from "../utils/supabase";
import { Session, User } from "@supabase/supabase-js";
import { View, ActivityIndicator, AppState, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { avatarUtils } from "@/utils/avatarUtils";

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
  onboarding_complete?: boolean;
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
  pendingComics: string[];
  addPendingComic: (dreamId: string) => Promise<void>;
  removePendingComic: (dreamId: string) => Promise<void>;
  pendingAvatars: string[];
  addPendingAvatar: (jobId: string) => Promise<void>;
  removePendingAvatar: (jobId: string) => Promise<void>;
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
  const [pendingComics, setPendingComics] = useState<string[]>([]);
  const [pendingAvatars, setPendingAvatars] = useState<string[]>([]);

  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    //Try to look for pending comics from storage
    const loadPendingJobs = async () => {
      try {
        const storedComic = await AsyncStorage.getItem("pendingComics");
        if (storedComic !== null) {
          setPendingComics(JSON.parse(storedComic));
        }

        const storedAvatars = await AsyncStorage.getItem("pendingAvatars");
        if (storedAvatars !== null) {
          setPendingAvatars(JSON.parse(storedAvatars));
        }
      } catch (e) {
        console.error("Failed to load pending comic from storage", e);
      }
    };
    loadPendingJobs();
  }, []);

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
        setLoading(false);
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

  const addPendingComic = async (dreamId: string) => {
    try {
      const updatedComics = [...pendingComics, dreamId];
      setPendingComics(updatedComics);
      await AsyncStorage.setItem(
        "pendingComics",
        JSON.stringify(updatedComics)
      );
    } catch (e) {
      console.error("Failed to save pending comic to storage", e);
    }
  };

  const removePendingComic = async (dreamId: string) => {
    try {
      const updatedComics = pendingComics.filter((id) => id !== dreamId);
      setPendingComics(updatedComics);
      await AsyncStorage.setItem(
        "pendingComics",
        JSON.stringify(updatedComics)
      );
    } catch (e) {
      console.error("Failed to remove pending comic form storage", e);
    }
  };

  const addPendingAvatar = async (jobId: string) => {
    try {
      const updatedAvatars = [...pendingAvatars, jobId];
      setPendingAvatars(updatedAvatars);

      await AsyncStorage.setItem(
        "pendingAvatars",
        JSON.stringify(updatedAvatars)
      );
    } catch (e) {
      console.error("Failed to save pending avatar to storage", e);
    }
  };

  const removePendingAvatar = async (jobId: string) => {
    try {
      setPendingAvatars((prev) => {
        const updatedAvatars = prev.filter((id) => id !== jobId);
        AsyncStorage.setItem("pendingAvatars", JSON.stringify(updatedAvatars));
        return updatedAvatars;
      });
    } catch (e) {
      console.error("Failed to remove pending avatar from storage", e);
    }
  };

  useEffect(() => {
    const checkAllPendingJobs = async () => {
      if (pendingComics.length === 0 && pendingAvatars.length === 0) {
        stopPolling();
        return;
      }
      if (pendingComics.length > 0) {
        for (const dreamId of pendingComics) {
          try {
            const res = await fetch(
              `https://dreamtoon.onrender.com/comic-status/${dreamId}`
            );
            const data = await res.json();
            if (data.status === "complete" || data.status === "error") {
              console.log(
                `Comic ${dreamId} finished with status: ${data.status}`
              );
              removePendingComic(dreamId);
            }
          } catch (error) {
            console.error(`Failed to poll for comic ${dreamId}:`, error);
          }
        }
      }

      // Check Avatars
      if (pendingAvatars.length > 0) {
        console.log(`Polling for ${pendingAvatars.length} avatars...`);
        for (const jobId of pendingAvatars) {
          try {
            const status = await avatarUtils.checkAvatarStatus(jobId);
            if (status === "complete" || status === "error") {
              console.log(
                `Avatar job ${jobId} finished with status: ${status}`
              );
              removePendingAvatar(jobId);
              if (status === "complete") {
                Alert.alert(
                  "🎉 Success!",
                  "Your new avatar is ready and has been added to your collection."
                );
                if (user) {
                  fetchProfile(user); // Refresh data to show new avatar everywhere
                }
              }
            }
          } catch (error) {
            console.error(`Failed to poll for avatar ${jobId}:`, error);
          }
        }
      }
    };

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) return;

      checkAllPendingJobs();
      pollingIntervalRef.current = setInterval(checkAllPendingJobs, 15000);
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        if (pendingComics.length > 0 || pendingAvatars.length > 0) {
          startPolling();
        }
      } else {
        stopPolling();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    if (pendingComics.length > 0 || pendingAvatars) {
      startPolling();
    }

    return () => {
      subscription.remove;
      stopPolling();
    };
  }, [pendingComics, pendingAvatars]);

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
    pendingComics,
    addPendingComic,
    removePendingComic,
    pendingAvatars,
    addPendingAvatar,
    removePendingAvatar,
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
