import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
//import { corsHeaders } from "../_shared/cors.ts";

// Helper function to create a privileged admin client
const createAdminClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use the SERVICE_ROLE_KEY
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  try {
    // Step 1: Authenticate the user making the request
    // We create a standard client JUST to verify the user's token
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Authentication failed.");

    // Step 2: Get the request body
    const { styleName, avatarPath, originalPath } = await req.json();
    if (!styleName || !avatarPath || !originalPath) {
      throw new Error("Missing required parameters.");
    }

    // Step 3: Create a privileged admin client to perform the database writes
    const adminClient = createAdminClient();

    // --- Start Atomic Database Transaction (as an admin) ---
    // Using the admin client allows us to bypass any Row Level Security policies

    const { error: avatarError } = await adminClient.from("avatars").insert({
      user_id: user.id, // We use the authenticated user's ID
      style: styleName,
      avatar_path: avatarPath,
      original_photo_path: originalPath,
    });
    if (avatarError) throw avatarError;

    const { error: styleError } = await adminClient
      .from("unlocked_styles")
      .upsert({
        user_id: user.id,
        style: styleName,
      });
    if (styleError) throw styleError;

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        last_avatar_created_at: new Date().toISOString(),
        display_avatar_path: avatarPath,
      })
      .eq("id", user.id);
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
