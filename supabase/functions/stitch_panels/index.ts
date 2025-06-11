// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas@v1.4.1/mod.ts";

const env = Deno.env.toObject();
const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const projectRef = (() => {
  const fromEnv = env.SUPABASE_PROJECT_REF?.trim();
  const fromURL = env.EXPO_PUBLIC_SUPABASE_URL?.match(
    /^https:\/\/([a-z0-9-]+)\.supabase\.co/i
  )?.[1];
  if (fromEnv && fromURL && fromEnv !== fromURL) {
    console.warn(
      `[process_dream] ⚠️  SUPABASE_PROJECT_REF (“${fromEnv}”) ≠ URL project (“${fromURL}”). Using the env var.`
    );
  }
  return (
    fromEnv ??
    fromURL ??
    (() => {
      throw new Error(
        "Neither SUPABASE_PROJECT_REF nor EXPO_PUBLIC_SUPABASE_URL present – can’t build stitch_panels URL."
      );
    })()
  );
})();

serve(async (req) => {
  try {
    // Health-check
    const urlObj = new URL(req.url);
    if (urlObj.searchParams.get("test") === "1") {
      return new Response(
        JSON.stringify({ message: "stitch_panels healthy" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only POST
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const urls = (body as { urls?: unknown }).urls;
    if (!Array.isArray(urls) || urls.length < 4 || urls.length > 6) {
      return new Response(
        "Expected JSON body with 'urls' array of 4 to 6 image URLs",
        { status: 400 }
      );
    }

    // Load and decode each image via canvas
    const images = await Promise.all(urls.map((url: string) => loadImage(url)));

    // Determine grid
    const panelCount = images.length;
    const cols = 2;
    const rows = panelCount === 4 ? 2 : 3;

    // Target final resolution: 1024×(rows===2?1024:1536)
    const finalWidth = 1024;
    const finalHeight = rows === 2 ? 1024 : 1536;

    // Compute target panel size
    const targetPanelWidth = finalWidth / cols;
    const targetPanelHeight = finalHeight / rows;

    // Create canvas
    const canvas = createCanvas(finalWidth, finalHeight);
    const ctx = canvas.getContext("2d");

    // Draw each panel in grid: left→right, top→bottom
    images.forEach((img, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      ctx.drawImage(
        img,
        0,
        0,
        img.width(),
        img.height(),
        col * targetPanelWidth,
        row * targetPanelHeight,
        targetPanelWidth,
        targetPanelHeight
      );
    });

    // Export canvas to PNG buffer
    const finalBuffer = canvas.toBuffer();

    // Upload to Supabase Storage
    const path = `stitched/${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage
      .from("comics")
      .upload(path, finalBuffer, { upsert: true, contentType: "image/png" });
    if (error) {
      console.error("Upload error:", error);
      return new Response(`Upload failed: ${error.message}`, { status: 500 });
    }

    // Return public URL
    const { data: pub } = supabase.storage.from("comics").getPublicUrl(path);
    return new Response(JSON.stringify({ url: pub.publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Internal server error: ${msg}`, { status: 500 });
  }
});
