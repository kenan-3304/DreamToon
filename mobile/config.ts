export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const projectRef = process.env.SUPABASE_PROJECT_REF ??
  SUPABASE_URL.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];

export const FUNCTIONS_BASE_URL = projectRef
  ? `https://${projectRef}.functions.supabase.co`
  : "";

export const PROCESS_DREAM_URL = `${FUNCTIONS_BASE_URL}/process_dream`;
