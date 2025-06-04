// deno-lint + bunch of imports
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";

const env = Deno.env.toObject();

/**
 * where the actual keys are pulled dont mess with this section at all
 */
const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
const admin = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY! });

/**
 * Some configurations
 */
const MAX_PANELS = 6;   // currently the hard cap dont want more than 6 panels
const MIN_PANELS = 4;   // enough for tiny story

/**
 * basic types
 */

type Panel = { description: string; speech: string };
interface Storyboard { title: string; panels: Panel[]; }

/**
 * GPT-4o prompt -> storyboard JSON.
 * Explicitly requests 4-6 panels so the model won't give long ass pages
 * prompt needs refinement
 */
const storyboardPrompt = (dream: string) => [
  {
    role: "system",
    content: `You are an award-winning comic-book storyboard artist. 
    Produce strictly valid JSON (no markdown) with a "title" string and a "panels" array **containing between 
    ${MIN_PANELS} and ${MAX_PANELS} items**. Each panel object needs "description" 
    (12-18 words, 3rd person, include one prop + camera angle) and "speech" (dialogue or empty string).`
  },
  {
    role: "user",
    content: `Dream transcript:\n"""\n${dream.trim()}\n"""\nNow output the JSON storyboard.`
  }
];

/**
 * For the MVP we just gonna stick with one style
 * can add a style picker later
 */
const decideComicStyle = () =>
  "Clean modern web-toon style, flat digital colours, thin black outlines";

/** build DALL·E composite prompt */
const buildCompositePrompt = (sb: Storyboard): string => {
  const artStyle = decideComicStyle();
  const panelList = sb.panels.map((p, i) => `${i + 1}. ${p.description}`).join("  ");

  const bubbleTexts = sb.panels.filter(p => p.speech.trim()).map(p => `"${p.speech.replace(/[“”]/g, '"')}"`).join(", ");
  const bubblesClause = bubbleTexts
    ? ` Every speech bubble must use one of exactly these texts: ${bubbleTexts}.`
    : " No speech bubbles.";

  // grid size: if its 4 do 2x2 if 6 do 2x3
  const cols = sb.panels.length <= 4 ? 2 : 3;
  const rows = Math.ceil(sb.panels.length / cols);
  const gridClause = `${sb.panels.length} equal panels in a neat ${cols}×${rows} grid with white gutters`;

  return `
${artStyle}. ${gridClause}, square format. Illustrate the panels in order: ${panelList}.${bubblesClause} Only art (and bubbles if specified)—no panel numbers, captions, onomatopoeia, or watermarks. full view, no cropping.`.replace(/\s+/g, " ").trim();
};

/**
 * Server entry
 */

const ALLOW_MOCK = env.ALLOW_MOCK === "true";

serve(async req => {
  const url    = new URL(req.url);
  const isMock = ALLOW_MOCK && url.searchParams.get("mock") === "true";

  // Mock mode for free testing
  if (isMock) {
    const fakePanels = Array.from({ length: MIN_PANELS }, (_, i) => ({ description: `Panel ${i + 1}`, speech: "" }));
    const fake: Storyboard = { title: "Test Dream", panels: fakePanels };
    const { data, error } = await admin.from("dreams").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      transcript: "Mock transcript",
      panel_count: fake.panels.length,
      storyboard: fake,
      composite_url: "https://placehold.co/1024x1024?text=Mock+Comic",
      cost_cents: 0
    }).select("id").single();
    if (error) return new Response(error.message, { status: 500 });
    return Response.json({ id: data.id, mock: true });
  }

  // actual flow
  try {
    const form   = await req.formData();
    const file   = form.get("audio") as File;
    const userId = form.get("user_id") as string | null;
    if (!file) throw new Error("audio file missing");

    // 1️ Whisper transcription
    const transcript: string = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "text"
    });

    // 2️ Storyboard (4-6 panels)
    let storyboard: Storyboard = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: storyboardPrompt(transcript),
      response_format: { type: "json_object" }
    }).then(r => JSON.parse(r.choices[0].message.content!));

    // Extra guard: truncate if model ignored the cap
    if (storyboard.panels.length > MAX_PANELS)
      storyboard.panels = storyboard.panels.slice(0, MAX_PANELS);

    // 3 Comic image – square for easier feed sharing
    const prompt   = buildCompositePrompt(storyboard);
    const imageURL = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      n: 1
    }).then(r => r.data[0].url!);

    // 4 Upload to Storage
    const buf  = new Uint8Array(await (await fetch(imageURL)).arrayBuffer());
    const path = `${userId || "anon"}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from("comics").upload(path, buf, { upsert: true, contentType: "image/png" });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { data: pub, error: urlErr } = admin.storage.from("comics").getPublicUrl(path);
    if (urlErr) throw new Error(`url: ${urlErr.message}`);

    // 5️⃣  Record dream
    const { data, error } = await admin.from("dreams").insert({
      user_id: userId,
      transcript,
      panel_count: storyboard.panels.length,
      storyboard,
      composite_url: pub.publicUrl,
      cost_cents: 10
    }).select("id").single();
    if (error) throw error;

    return Response.json({ id: data.id });
  } catch (err) {
    console.error(err);
    return new Response(err.message, { status: 500 });
  }
});