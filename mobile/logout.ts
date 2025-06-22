import { supabase } from './supabaseClient';
import { firebaseAuth } from './firebaseAuth';

/**
 * Sign out from both Firebase and Supabase.
 */
export async function logout() {
  await firebaseAuth.signOut();
  await supabase.auth.signOut();
}
