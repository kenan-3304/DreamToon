import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { firebaseAuth } from './firebaseClient';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
}

interface UserContextState {
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (uid: string, updates: Partial<Profile>) => Promise<void>;
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
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('id,name,phone')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  };

  const updateProfile = async (uid: string, updates: Partial<Profile>) => {
    if (!uid) return;
    await supabase.from('profiles').update(updates).eq('id', uid);
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
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
