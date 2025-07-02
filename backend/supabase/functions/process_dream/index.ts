// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";

// --- All your original setup code remains the same ---
const env = Deno.env.toObject();
const DEBUG = (env.DEBUG ?? "").toLowerCase() === "true";
const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
const admin = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
type Panel = { description: string; speech: string };
interface Storyboard {
  title: string;
  style: string;
  panels: Panel[];
}
const storyboardPrompt = (dream: string) => [
  {
    role: "system",
    content: `
You are an award-winning comic-book story artist.

Goal → Return a storyboard **JSON** describing ONE short comic in **4 - 6 panels**.  
The comic must:

• use a CONSISTENT visual style (name the style clearly)  
• keep the same main character design throughout  
• have a clear beginning → middle → end that matches the dream  
• avoid content that would violate the OpenAI policy (e.g. no explicit sex, gore, hate)  

JSON schema **exactly**:
{
 "title":        string,                    // ≤ 60 chars
 "style":        string,                    // vivid 1-sentence art-style summary
 "panels": [                                // length 4-6
   {
     "description": string,                // 1-2 sentences: setting, characters, camera angle, mood
     "speech":      string                 // dialogue or "" (keep short)
   }
 ]
}

Return ONLY the JSON object. Do NOT wrap it in markdown or extra text.
`.trim(),
  },
  {
    role: "user",
    content: `Dream transcript (verbatim):\n"""\n${dream.trim()}\n"""`,
  },
];

/******************************************************************
 * 2)  Re-usable “shared style” block for DALL-E
 ******************************************************************/
const sharedBlock = (style: string, characterDesign: string) =>
  `
${style}. ${characterDesign}. 
Limited coherent colour palette; crisp comic-ink outlines; cinematic lighting.
`
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

/******************************************************************
 * 3)  Build the final DALL-E prompt for each panel
 ******************************************************************/
const POLICY_TAIL =
  "The image must not contain sexual content, graphic violence, hateful symbols or copyrighted characters.";

const sanitize = (s: string) =>
  s
    // quick sanitiser – redact any obvious banned words
    .replace(/\\b(rape|sex|nude|kill|blood|gore)\\b/gi, "[redacted]")
    // collapse whitespace so we stay under token limits
    .replace(/\\s+/g, " ")
    .trim();

const panelPrompt = (p: Panel, idx: number, shared: string, total: number) => {
  const base = `
    Panel ${idx + 1} of ${total}. 
    ${
      idx === 0
        ? "Establish the scene."
        : "Match EXACT style and character design from description below."
    }
    ${shared}
    ${p.description}.
    ${p.speech ? `Speech bubble text: "${p.speech}".` : ""}
    ${POLICY_TAIL}
    `;
  return sanitize(base);
};

const buildHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${env.OPENAI_API_KEY}`,
  ...(env.OPENAI_PROJECT_ID ? { "OpenAI-Project": env.OPENAI_PROJECT_ID } : {}),
});

serve(async (req) => {
  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error(
        "Authentication error: No Authorization header provided."
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      throw new Error(`Authentication error: ${userError?.message}`);
    }

    const userId = user.id;

    // Get user profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("character_design")
      .eq("id", userId)
      .single();

    // Use default character design if profile not found
    const characterDesign =
      profile?.character_design ||
      "A friendly character with expressive features, drawn in a modern cartoon style.";

    /* GET FORM DATA */
    const form = await req.formData();
    const text = form.get("text") as string | null;
    const audioFile = form.get("audio") as File | null;
    const comicId = crypto.randomUUID();
    let transcript: string | null = null;

    if (text && text.trim().length > 0) {
      transcript = text.trim();
    } else if (audioFile) {
      // Handle audio transcription
      const audioBytes = new Uint8Array(await audioFile.arrayBuffer());

      // Upload audio to temporary storage
      const audioPath = `${userId}/${comicId}/audio.m4a`;
      const { error: uploadError } = await supabase.storage
        .from("comics")
        .upload(audioPath, audioBytes, {
          upsert: true,
          contentType: "audio/m4a",
        });

      if (uploadError)
        throw new Error(`Audio upload failed: ${uploadError.message}`);

      // Get public URL for transcription
      const { data: audioUrl } = supabase.storage
        .from("comics")
        .getPublicUrl(audioPath);

      // Transcribe audio using OpenAI Whisper
      const transcriptionResponse = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: (() => {
            const formData = new FormData();
            const audioBlob = new Blob([audioBytes], { type: "audio/m4a" });
            formData.append("file", audioBlob, "audio.m4a");
            formData.append("model", "whisper-1");
            return formData;
          })(),
        }
      );

      if (!transcriptionResponse.ok) {
        throw new Error(
          `Transcription failed: ${transcriptionResponse.statusText}`
        );
      }

      const transcriptionResult = await transcriptionResponse.json();
      transcript = transcriptionResult.text;

      if (!transcript || transcript.trim().length === 0) {
        throw new Error("Audio transcription returned empty result");
      }

      if (DEBUG) {
        console.log("🎤 Transcribed audio:", transcript);
      }
    } else {
      throw new Error("Either text or audio must be provided");
    }

    /* GENERATE STORYBOARD WITH GPT */
    const sb: Storyboard = await new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
    }).chat.completions
      .create({
        model: "gpt-4o",
        messages: storyboardPrompt(transcript!),
        response_format: { type: "json_object" },
      })
      .then((r) => JSON.parse(r.choices[0].message.content!));

    if (DEBUG) {
      console.log("📜 Storyboard from OpenAI:", JSON.stringify(sb, null, 2));
    }

    // Validate storyboard
    if (!sb || !Array.isArray(sb.panels)) {
      console.error("Invalid storyboard format received from OpenAI.");
      throw new Error("Failed to generate a valid storyboard from OpenAI.");
    }

    // Set the art style and character design for DALL-E
    const SHARED = sharedBlock(sb.style, characterDesign);

    /* GENERATE & UPLOAD PANELS WITH DALL-E */
    const imageUrls: string[] = [];
    for (let i = 0; i < sb.panels.length; i++) {
      const prompt = panelPrompt(sb.panels[i], i, SHARED);
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
        console.error(`❌ Panel ${i + 1} generation failed`);
        continue;
      }

      const openUrl = (await res.json()).data[0].url as string;
      const imgRes = await fetch(openUrl);
      const bytes = new Uint8Array(await imgRes.arrayBuffer());

      const panelPath = `${userId}/${comicId}/${i + 1}.png`;
      const { error } = await supabase.storage
        .from("comics")
        .upload(panelPath, bytes, { upsert: true, contentType: "image/png" });

      if (error) throw new Error(`Upload failed: ${error.message}`);

      const { data: pub } = supabase.storage
        .from("comics")
        .getPublicUrl(panelPath);
      imageUrls.push(pub.publicUrl);
    }

    /* RECORD TO DATABASE */
    await admin.from("comics").insert({
      id: comicId,
      user_id: userId,
      transcript,
      panel_count: sb.panels.length,
      storyboard: sb,
      image_urls: imageUrls,
      cost_cents: 5 * sb.panels.length,
    });

    /* RESPOND TO CLIENT */
    return new Response(JSON.stringify({ comicId, urls: imageUrls }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (DEBUG) console.error(e);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
