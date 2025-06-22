import { auth } from './firebase';
import { supabase } from './supabaseClient';

export async function syncSupabaseSession() {
  const user = auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await supabase.auth.signInWithIdToken({ provider: 'firebase', token });
}
