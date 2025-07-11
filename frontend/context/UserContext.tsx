import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "../utils/supabase";
import { Session, User } from "@supabase/supabase-js";
import { View } from "react-native";

//sets up the profile interface
interface Profile {
  id: string;
  name?: string;
  character_design?: string;
  avatar_url?: string;
  original_photo_url?: string;
}

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  //handle auth changes and initial load
  useEffect(() => {
    setLoading(true);

    // get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      //if there is a user then get their profile
      if (session?.user) {
        fetchProfile(session.user);
      }
      setLoading(false);
    });

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
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (user: User) => {
    try {
      //try to get the data from a profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      //if there is data boom we are done return
      if (data) {
        setProfile(data);
        return;
      }

      //if there is a error because there is no profile then create one
      if (error && error.code == "PGRST116") {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            name: user.email?.split("@")[0] || "Dreamer",
          })
          .select()
          .single();

        if (createError) throw createError;

        setProfile(newProfile);
      } else if (error) {
        //if there is any other error just throw it and forget
        throw error;
      }
    } catch (error) {
      console.log("Error with fetching user profile:", error);
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

  const value = { session, user, profile, loading, logout, updateProfile };

  //loading screen while initial session is being fetched
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

export const useUser = () => {
  const context = useContext(UserContext);
  if (context == undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
