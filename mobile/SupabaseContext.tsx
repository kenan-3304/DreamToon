import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

type ContextValue = {
  userId: string | null;
};

const SupabaseContext = createContext<ContextValue>({ userId: null });

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      listener.subscription?.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={{ userId }}>{children}</SupabaseContext.Provider>
  );
};

export const useSupabaseUserId = () => useContext(SupabaseContext).userId;
