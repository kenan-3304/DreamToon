import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Replace with your project's credentials ---
const SUPABASE_URL = "https://lzrhocmfiulykdxjzaku.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cmhvY21maXVseWtkeGp6YWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjA0NjIsImV4cCI6MjA2NDI5NjQ2Mn0.nsHFSWVuS-j73YwQztvA3SY6cUuA7CqWLoECXwFTwIM";
const TEST_USER_EMAIL = "test@eg.com";
const TEST_USER_PASSWORD = "test123";
// ---------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getToken() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (error) {
    console.error("Error signing in:", error.message);
    return;
  }

  console.log("Authentication successful! Your token is:\n");
  console.log(data.session.access_token);
}

getToken();
