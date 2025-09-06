import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  ReactNode,
  cache,
} from "react";
import { supabase } from "../utils/supabase";
import { Session, User } from "@supabase/supabase-js";
import { View, ActivityIndicator, AppState, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { avatarUtils } from "@/utils/avatarUtils";
import { useRouter } from "expo-router";

const router = useRouter();
interface ComicData {
  panel_urls: string[];
  title?: string;
  created_at?: string;
}

interface CompletedComicInfo {
  dreamId: string;
  panelUrls: string[];
}

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
  completedComicData: CompletedComicInfo | null;
  clearCompletedComicData: () => void;
  getComicById: (id: string) => Promise<ComicData | null>;
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
  const [completedComicData, setCompletedComicData] =
    useState<CompletedComicInfo | null>(null);

  const pollingIntervalRef = useRef<number | null>(null);
  const [comicCache, setComicCache] = useState<{ [id: string]: ComicData }>({});

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
          try {
            const cachedProfile = await AsyncStorage.getItem(
              `profile-${currentUser.id}`
            );
            if (cachedProfile) {
              setProfile(JSON.parse(cachedProfile));
            }
          } catch (e) {
            console.error("Failed to load cached profile", e);
          }

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

        await AsyncStorage.setItem(
          `profile-${user.id}`,
          JSON.stringify(profileResult.data)
        );
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
      const updatedAvatars = pendingAvatars.filter((id) => id !== jobId);
      setPendingAvatars(updatedAvatars);
      await AsyncStorage.setItem(
        "pendingAvatars",
        JSON.stringify(updatedAvatars)
      );
    } catch (e) {
      console.error("Failed to remove pending avatar from storage", e);
    }
  };

  const clearCompletedComicData = () => {
    setCompletedComicData(null);
  };

  const incrementDailyCreationCount = async () => {
    setProfile((currentProfile) => {
      if (!currentProfile) {
        return null;
      }

      const today = new Date().toDateString();
      const lastCreationDate = currentProfile.last_creation_date
        ? new Date(currentProfile.last_creation_date).toDateString()
        : null;

      const newCount =
        today === lastCreationDate
          ? (currentProfile.daily_creation_count || 0) + 1
          : 1;

      const newDate = new Date();

      updateProfile({
        daily_creation_count: newCount,
        last_creation_date: newDate,
      });

      return {
        ...currentProfile,
        daily_creation_count: newCount,
        last_creation_date: newDate,
      };
    });
    // if (!profile) return;

    // const today = new Date().toDateString();
    // const lastCreationDate = profile.last_creation_date
    //   ? new Date(profile.last_creation_date).toDateString()
    //   : null;

    // // If it's a new day, reset the count to 1
    // // If it's the same day, increment the existing count
    // const newCount =
    //   today === lastCreationDate ? (profile.daily_creation_count || 0) + 1 : 1;

    // await updateProfile({
    //   daily_creation_count: newCount,
    //   last_creation_date: new Date(),
    // });
  };

  const getComicById = async (id: string): Promise<ComicData | null> => {
    if (comicCache[id]) {
      console.log(`Returning comic ${id} from the cache`);
      return comicCache[id];
    }

    try {
      console.log(`Fetching comic ${id} from network.`);
      const res = await fetch(
        `https://dreamtoon.onrender.com/comic-status/${id}`
      );
      const data = await res.json();

      if (data.status === "complete") {
        // 3. Add to cache and return
        setComicCache((prevCache) => ({ ...prevCache, [id]: data }));
        return data;
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch comic", e);
      return null;
    }
  };

  useEffect(() => {
    const checkAllPendingJobs = async () => {
      if (pendingComics.length === 0 && pendingAvatars.length === 0) {
        return;
      }
      if (pendingComics.length > 0) {
        for (const dreamId of pendingComics) {
          try {
            const res = await fetch(
              `https://dreamtoon.onrender.com/comic-status/${dreamId}`
            );
            const data = await res.json();
            if (data.status === "complete") {
              console.log(
                `Comic ${dreamId} finished with status: ${data.status}`
              );

              // Increment daily creation count properly
              await incrementDailyCreationCount();

              setCompletedComicData({
                dreamId: dreamId,
                panelUrls: data.panel_urls,
              });

              removePendingComic(dreamId);
            } else if (data.status === "error") {
              let errorTitle = "Comic Generation Failed";
              let errorMessage =
                "Something went wrong while creating your comic. Please try again.";

              // Check if we have enhanced error information
              if (data.error_type && data.error_message) {
                switch (data.error_type) {
                  case "moderation":
                    errorTitle = "Content Policy Violation";
                    errorMessage =
                      "Your dream contains content that doesn't meet our community guidelines. Please revise your story and try again.";
                    break;
                  case "avatar":
                    errorTitle = "Avatar Issue";
                    errorMessage =
                      "We couldn't find your avatar for this style. Please create a new avatar first.";
                    break;
                  case "audio":
                    errorTitle = "Audio Processing Issue";
                    errorMessage =
                      "We couldn't understand your audio recording. Please try speaking more clearly or use text input instead.";
                    break;
                  case "network":
                    errorTitle = "Connection Problem";
                    errorMessage =
                      "We're having trouble connecting to our servers. Please check your internet connection and try again.";
                    break;
                  case "image_generation_error":
                  case "generation":
                    errorTitle = "Image Generation Failed";
                    errorMessage =
                      "We couldn't generate your comic images. This might be due to high server load or a moderation issue. Please try again in a few minutes.";
                    break;
                  case "llm_error":
                    errorTitle = "Story Processing Failed";
                    errorMessage =
                      "We couldn't process your story. Please try again with a different story.";
                    break;
                  case "storage_error":
                    errorTitle = "Storage Issue";
                    errorMessage =
                      "We couldn't save your comic. Please try again.";
                    break;
                  case "database_error":
                    errorTitle = "Server Error";
                    errorMessage =
                      "We're experiencing technical difficulties. Please try again later.";
                    break;
                  case "server":
                    errorTitle = "Server Busy";
                    errorMessage =
                      "Our servers are currently busy. Please wait a moment and try again.";
                    break;
                  default:
                    errorTitle = "Comic Generation Failed";
                    errorMessage =
                      data.error_message ||
                      "Something went wrong while creating your comic. Please try again.";
                }
              }
              removePendingComic(dreamId);
              Alert.alert(errorTitle, errorMessage);
              router.replace("/(tab)");
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
              } else if (status === "error") {
                Alert.alert(
                  "Avatar Creation Failed",
                  "We couldn't create your avatar. Please try again."
                );
              }
            }
          } catch (error) {
            console.error(`Failed to poll for avatar ${jobId}:`, error);
          }
        }
      }
    };

    const managePolling = () => {
      const hasPendingJobs =
        pendingComics.length > 0 || pendingAvatars.length > 0;
      if (hasPendingJobs && pollingIntervalRef.current === null) {
        console.log("STARTING POLLING");
        checkAllPendingJobs();
        pollingIntervalRef.current = setInterval(checkAllPendingJobs, 15000);
      } else if (!hasPendingJobs && pollingIntervalRef.current) {
        console.log("STOPPING POLLING (no more jobs)");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // const stopPolling = () => {
    //   if (pollingIntervalRef.current) {
    //     clearInterval(pollingIntervalRef.current);
    //     pollingIntervalRef.current = null;
    //   }
    // };

    // const startPolling = () => {
    //   if (pollingIntervalRef.current) return;

    //   checkAllPendingJobs();
    //   pollingIntervalRef.current = setInterval(checkAllPendingJobs, 15000);
    // };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        managePolling();
      } else {
        if (pollingIntervalRef.current) {
          console.log("STOPPING POLLING (app backgrounded)");
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }

      //   if (pendingComics.length > 0 || pendingAvatars.length > 0) {
      //     startPolling();
      //   }
      // } else {
      //   stopPolling();
      // }
    };

    managePolling();

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // if (pendingComics.length > 0 || pendingAvatars) {
    //   startPolling();
    // }

    return () => {
      subscription.remove();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // stopPolling();
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
    completedComicData,
    clearCompletedComicData,
    getComicById,
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
