import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { supabase } from './supabaseClient';
import { firebaseAuth, syncSupabaseSession } from './firebase';

type ContextValue = {
  userId: string | null;
};

const SupabaseContext = createContext<ContextValue>({ userId: null });

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Initial load
    setUserId(firebaseAuth.currentUser?.uid ?? null);
    syncSupabaseSession();

    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
      setUserId(firebaseAuth.currentUser?.uid ?? null);
      syncSupabaseSession();
    });

    return unsubscribe;
  }, []);

  return (
    <SupabaseContext.Provider value={{ userId }}>{children}</SupabaseContext.Provider>
  );
};

export const useSupabaseUserId = () => useContext(SupabaseContext).userId;
