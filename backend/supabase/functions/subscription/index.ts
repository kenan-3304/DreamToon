import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper function to create a Supabase admin client
const createAdminClient = () => {
  return createClient(
    Deno.env.get("EXPO_PUBLIC_SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
};

serve(async (req) => {
  try {
    // verify the rev cat auth header
    const revenueCatSecret = Deno.env.get("REVENUE_CAT_SECRET");
    const authHeader = req.headers.get("Authorization");

    if (authHeader !== revenueCatSecret) {
      console.error("Unauthorized webhook attempt.");
      return new Response("Unauthorized", { status: 401 });
    }

    // parse data
    const payload = await req.json();
    const event = payload.event;

    // get user id
    const userId = event.app_user_id;
    if (!userId) {
      throw new Error("No app_user_id provided in webhook.");
    }

    const admin = createAdminClient();
    let updateData = {};

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION": // User re-enables auto-renew
        updateData = {
          subscription_status: event.period_type.toLowerCase(), // this is either 'trial' or 'normal'
          trial_ends_at: event.expiration_at_ms
            ? new Date(event.expiration_at_ms).toISOString()
            : null,
          revenuecat_customer_id: event.customer_info.original_app_user_id, // Store the main RC ID
        };
        break;

      case "CANCELLATION":
        updateData = {
          subscription_status: "cancelled",
        };
        break;

      case "EXPIRATION":
        updateData = {
          subscription_status: "free",
        };
        break;

      default:
        console.log(`Received unhandled event type: ${event.type}`);
        return new Response("OK: Unhandled event type", { status: 200 });
    }

    // 5. Use UPDATE, not INSERT, to modify the existing profile
    const { error } = await admin
      .from("profiles") // Using plural 'profiles' as is standard
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }
  } catch (e) {
    console.error("An error occurred in the webhook handler:", e.message);
    return new Response(
      JSON.stringify({ error: `Webhook handler failed: ${e.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Always return a 200 OK to RevenueCat so it knows the webhook was received.
  return new Response("OK", { status: 200 });
});
