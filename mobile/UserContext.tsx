import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
}

interface UserContextState {
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const UserContext = createContext<UserContextState>({
  profile: null,
  refreshProfile: async () => {},
  updateProfile: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = async () => {
    const user = supabase.auth.getUser();
    const userId = (await user).data.user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('id,name,phone')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    await supabase.from('profiles').update(updates).eq('id', profile.id);
    setProfile(updated);
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <UserContext.Provider value={{ profile, refreshProfile, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};
