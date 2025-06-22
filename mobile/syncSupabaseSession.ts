import { supabase } from './supabaseClient';
import { firebaseAuth } from './firebase';

export async function syncSupabaseSession() {
  const token = await firebaseAuth.currentUser?.getIdToken();
  if (!token) return;
  await supabase.auth.signInWithIdToken({
    provider: 'firebase',
    token,
  });
}
