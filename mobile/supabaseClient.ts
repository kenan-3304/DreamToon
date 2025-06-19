// supabase.ts
import 'react-native-url-polyfill/auto';          
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  /* these options came from the other branch and are worth keeping */
  auth: {
    persistSession: true,   // store refresh-token in Keychain/SecureStore
    autoRefreshToken: true, // silently refresh in the background
  },
});

