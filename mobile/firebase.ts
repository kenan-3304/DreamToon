import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { supabase } from './supabaseClient';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export const syncSupabaseSession = async () => {
  const user = firebaseAuth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    await supabase.auth.signInWithIdToken({ provider: 'firebase', token });
  } else {
    await supabase.auth.signOut();
  }
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
