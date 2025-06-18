// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";

const env = Deno.env.toObject();

/* ───────── DEBUG flag ───────── */
const DEBUG = (env.DEBUG ?? "").toLowerCase() === "true";

/* ───────── Supabase clients ───────── */
const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
const admin = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/* ───────── Project ref helper ───────── */
const projectRef = (() => {
  const fromEnv = env.SUPABASE_PROJECT_REF?.trim();
  const fromURL = env.EXPO_PUBLIC_SUPABASE_URL?.match(
    /^https:\/\/([a-z0-9-]+)\.supabase\.co/i
  )?.[1];
  if (fromEnv && fromURL && fromEnv !== fromURL) {
    console.warn(
      `[process_dream] ⚠️  SUPABASE_PROJECT_REF (“${fromEnv}”) ≠ URL project (“${fromURL}”). Using env var.`
    );
  }
  return (
    fromEnv ??
    fromURL ??
    (() => {
      throw new Error(
        "Neither SUPABASE_PROJECT_REF nor EXPO_PUBLIC_SUPABASE_URL present."
      );
    })()
  );
})();

/* ───────── Constants & helpers ───────── */
const MAX_PANELS = 6;
const MIN_PANELS = 4;
const character_design =
  "white male, 20 years old 6' tall, 180lbs, brown curly hair";

type Panel = { description: string; speech: string };
interface Storyboard {
  title: string;
  style: string;
  panels: Panel[];
}

/* ───────── GPT prompt builder ───────── */
const storyboardPrompt = (dream: string) => [
  {
    role: "system",
    content: `You are an award-winning comic storyboard artist.
    Return STRICT JSON with keys: "style","title","panels".
    4-6 panels; each description has at least 50 words, ASCII-safe, no gore or explicit content.`,
  },
  {
    role: "user",
    content: `Dream transcript:\n"""\n${dream.trim()}\n"""\nNow output JSON storyboard.`,
  },
];

/* ───────── DALL-E prompt builders ───────── */
const sharedBlock = (sb: Storyboard) =>
  `Flat-ink graphic novel style with no gradients or shading.
Use a limited color palette: black, cream, and one muted accent color (like teal or rust). 
Keep it all visually cohesive: same character proportions, outfit, facial structure, and drawing style. 
No text or symbols outside of designated speech bubbles. character design: ${character_design}`.trim();

const panelPrompt = (p: Panel, idx: number, shared: string) => {
  const continuity =
    idx === 0
      ? ""
      : "Match EXACT style, palette and character design listed below. ";
  const desc = p.description;
  const speech = p.speech;
  return `
${continuity}${shared}

${desc}.
${speech ? `Speech bubble: '${speech}'.` : ""}
`.trim();
};

/* ───────── HTTP helper ───────── */
const buildHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${env.OPENAI_API_KEY}`,
  ...(env.OPENAI_PROJECT_ID ? { "OpenAI-Project": env.OPENAI_PROJECT_ID } : {}),
});

/* ───────── Edge Function ───────── */
serve(async (req) => {
  try {
    /* 0 — health check */
    if (new URL(req.url).searchParams.get("test") === "1") {
      const dummy = Array(6).fill(
        "https://lzrhocmfiulykdxjzaku.supabase.co/storage/v1/object/public/comics/00000000-0000-0000-0000-000000000000/18a6b2c4-b370-435a-b7bb-44d693ce63fb.png"
      );
      const stitch = await fetch(
        `https://${projectRef}.functions.supabase.co/stitch_panels`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ urls: dummy }),
        }
      );
      if (!stitch.ok) {
        throw new Error(await stitch.text());
      }
      const { url } = await stitch.json();
      return new Response(url, { status: 200 });
    }

    /* 1 — form data */
    const form = await req.formData();
    const file = form.get("audio") as File | null;
    const userId = form.get("user_id") as string | null;
    if (!file) throw new Error("audio file missing");

    /* 2 — whisper */
    const transcript = await new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
    }).audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "text",
    });

    /* 3 — storyboard */
    const sb: Storyboard = await new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
    }).chat.completions
      .create({
        model: "gpt-4o",
        messages: storyboardPrompt(transcript),
        response_format: { type: "json_object" },
      })
      .then((r) => JSON.parse(r.choices[0].message.content!));

    console.log("📜 Storyboard:", JSON.stringify(sb, null, 2));

    sb.panels = sb.panels.slice(0, MAX_PANELS);
    if (sb.panels.length < MIN_PANELS) {
      throw new Error("Storyboard < 4 panels");
    }
    const SHARED = sharedBlock(sb);

    /* 4 — generate each panel (no retry) */
    const urls: string[] = [];
    for (let i = 0; i < sb.panels.length; i++) {
      const prompt = panelPrompt(sb.panels[i], i, SHARED);

      console.log(`🖼️  Panel ${i + 1} (${prompt.length} chars) ⇢ ${prompt}`);

      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          quality: "standard",
          size: "1024x1024",
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        console.error(
          `❌ Panel ${
            i + 1
          } generation failed\nPrompt:\n${prompt}\nRaw error:\n${errTxt}`
        );
        urls.push(
          "https://lzrhocmfiulykdxjzaku.supabase.co/storage/v1/object/public/comics/00000000-0000-0000-0000-000000000000/18a6b2c4-b370-435a-b7bb-44d693ce63fb.png"
        );
        continue;
      }
      urls.push((await res.json()).data[0].url as string);
      console.log(`🖼️  Panel ${i + 1} generated`);
    }

    /* 5 — record + respond (no stitching) */
    await admin.from("dreams").insert({
      user_id: userId,
      transcript,
      panel_count: sb.panels.length,
      storyboard: sb,
      composite_url: null,
      cost_cents: 5 * sb.panels.length,
    });

    return new Response(JSON.stringify({ urls }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
