export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const SUPABASE_PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ??
  SUPABASE_URL.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ??
  "";

export const FUNCTIONS_BASE_URL = SUPABASE_PROJECT_REF
  ? `https://${SUPABASE_PROJECT_REF}.functions.supabase.co`
  : "";

export const PROCESS_DREAM_URL = `${FUNCTIONS_BASE_URL}/process_dream`;

export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";
export const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
export const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "";
export const FIREBASE_APP_ID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "";
