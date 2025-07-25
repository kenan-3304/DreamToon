// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The admin client is necessary for this server-side operation
const admin = createClient(
  Deno.env.get("EXPO_PUBLIC_SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

serve(async (req) => {
  try {
    const { record: user } = await req.json();

    // Do not create a profile if one already exists for this user
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existingProfile) {
      console.log(`Profile already exists for user: ${user.id}`);
      return new Response("Profile already exists", { status: 200 });
    }

    // Insert a new row into your "profiles" table
    const { error } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        name: "New User",
        character_design: "Default character design",
      });

    if (error) throw error;

    console.log(`Profile created for user: ${user.id}`);
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
