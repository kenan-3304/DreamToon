// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";

const env = Deno.env.toObject();
const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY! });

/* ---------- helpers ----------------------------------------------------- */

const storyboardPrompt = (dream: string) => [
  {
    role: "system",
    content: `You are an award-winning comic-book storyboard artist.
Return strictly valid JSON (no markdown) that matches:

{
  "title": string,           // 2-8 punchy words
  "panels": [                // 4-5 panels total
    { "description": string, // 12-18 words, 3rd-person, 1 key prop + camera angle
      "speech": string }     // ≤7 words, or "" if silent
  ]
}`
  },
  {
    role: "user",
    content: `Dream transcript:
"""
${dream.trim()}
"""
Now output the JSON storyboard.`
  }
];

const buildCompositePrompt = (sb: any) => {
  const panels = sb.panels.map(
    (p: any, i: number) =>
      `Panel ${i + 1}: ${p.description} — bubble: “${p.speech || ""}”`
  ).join(" ");

  return (
    `Vintage 1970s DC pop-art comic, ${sb.panels.length} panels in neat rows, ` +
    `white gutters. Title banner: “${sb.title}”. Bold inks, flat retro colours, ` +
    `light halftone dots. Keep main character consistent. ${panels}`
  ).replace(/\s+/g, " ").trim();
};

/* ---------- main -------------------------------------------------------- */

serve(async req => {
  const url     = new URL(req.url);
  const isMock  = url.searchParams.get("mock") === "true";

  /* --- MOCK MODE (no OpenAI cost) -------------------------------------- */
  if (isMock) {
    const fake = {
      title: "Test Dream",
      panels: Array.from({ length: 4 }, (_, i) => ({
        description: `Test panel ${i + 1}`,
        speech: ""
      }))
    };

    const { data, error } = await supabase.from("dreams").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      transcript: "Mock transcript",
      panel_count: 4,
      storyboard: fake,
      composite_url: "https://placehold.co/1024x1024?text=Mock+Comic",
      cost_cents: 0
    }).select("id").single();

    if (error) return new Response(error.message, { status: 500 });
    return new Response(JSON.stringify({ id: data.id, mock: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  /* --- REAL FLOW ------------------------------------------------------- */

  // parse multipart
  const form    = await req.formData();
  const file    = form.get("audio") as File;
  const userId  = form.get("user_id") as string;

  /* 1️⃣  Whisper transcription */
  const transcript = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    response_format: "text"
  });
  console.log("🟢 whisper done", transcript.slice(0, 60), "...");

  /* 2️⃣  GPT storyboard (trimmed prompt) */
  const storyboard = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: storyboardPrompt(transcript),
    response_format: { type: "json_object" }
  }).then(r => JSON.parse(r.choices[0].message.content!));
  console.log("🟢 storyboard title:", storyboard.title);

  /* 3️⃣  DALL·E image */
  const prompt = buildCompositePrompt(storyboard);
  console.log("🖼 prompt (chars):", prompt.length);

  const imageURL = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    size: "1024x1024",
    n: 1
  }).then(r => r.data[0].url!);

  /* 4️⃣  upload to Supabase Storage */
  const buf  = new Uint8Array(await (await fetch(imageURL)).arrayBuffer());
  const path = `${crypto.randomUUID()}.png`;

  const { error: upErr } =
    await supabase.storage.from("comics").upload(path, buf, { upsert: true });
  if (upErr) console.error("❌ upload error:", upErr.message);

  const { data: urlData, error: urlErr } =
    supabase.storage.from("comics").getPublicUrl(path);

  const publicUrl = urlData?.publicUrl || null;
  console.log(publicUrl ? "✅ public URL:" : "❌ url error:", publicUrl ?? urlErr?.message);

  /* 5️⃣  insert DB row */
  const { data, error } = await supabase.from("dreams").insert({
    user_id: userId || null,
    transcript,
    panel_count: storyboard.panels.length,
    storyboard,
    composite_url: publicUrl,
    cost_cents: 10    // whisper + image
  }).select("id").single();

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ id: data.id }), {
    headers: { "Content-Type": "application/json" }
  });
});
