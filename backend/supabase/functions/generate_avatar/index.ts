import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";

// --- All your original setup code remains the same ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAIKey = Deno.env.get("OPENAI_API_KEY")!;

// Initialize clients with the variables
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const openai = new OpenAI({
  apiKey: openAIKey, // Corrected from "apikey" to "apiKey"
});

const ghibliPrompt =
  "a vibrant, whimsical, and heartwarming portrait in the Studio Ghibli art style, with soft, painterly textures and a touch of fantasy.";
//const animePrompt = "anime style"

function isImageUrl(str: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"];
  const lowerCaseStr = str.toLowerCase();
  //if the format listed above is in the string I reckon we got an image
  return imageExtensions.some((ext) => lowerCaseStr.endsWith(ext));
}

// --- Function to generate avatar ---

serve(async (req) => {
  //try to get the image

  //add auth here
  /**
   * try {
   * } catch ()
   */
  console.log("serve function started");

  const contentType = req.headers.get("Content-Type");

  let image_url: string | null = null;

  if (!contentType || !contentType.includes("application/json")) {
    return new Response("Invalid content type", { status: 400 });
  }

  const body = await req.json();
  image_url = body.text as string | null;

  if (!image_url || !isImageUrl(image_url)) {
    return new Response("Invalid string", { status: 400 });
  }

  try {
    const imageRes = await fetch(image_url);
    if (!imageRes.ok) {
      throw new Error(`failed to fetch image Status: ${imageRes.status}`);
    }

    const imageFile = await imageRes.arrayBuffer();
    console.log("we about to start the image generation");

    const response = await openai.images.edit({
      image: {
        buffer: new Uint8Array(imageFile),
        name: "test.png",
      },
      prompt: ghibliPrompt,
      n: 1,
      size: "1024x1024",
      model: "gpt-image-1",
    });

    const newImage = response.data[0]?.b64_json;

    if (newImage) {
      console.log(newImage);

      //this is where i would save to db

      return new Response(
        JSON.stringify({
          b64_json: newImage,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      throw new Error("OpenAi failed to send a good image");
    }
  } catch (error) {
    console.error("some error occured when recieving image", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Contenty-Type": "application/json",
        },
      }
    );
  }
});

/**
 * To test the generation logic directly, you can create and call
 * the testGeneration function below.
 *
 * In your terminal, run:
 * deno run --allow-net --allow-env --allow-write your_file_name.ts
 */

async function testGeneration() {
  // Use the local file path directly
  const localImagePath = "./test_images/kenan.jpg";
  const outputDir = "./test_images/output_img";

  console.log(`[Test] Starting image generation for: ${localImagePath}`);

  try {
    // Step 1: Read the local image file from the disk
    console.log("[Test] Reading local image file...");
    const imageFile = await Deno.readFile(localImagePath);
    console.log("[Test] Input image read successfully.");

    // Step 2: Call the OpenAI API (this part is the same)
    console.log("[Test] Calling OpenAI to generate Ghibli version...");
    const response = await openai.images.edit({
      image: {
        buffer: imageFile, // Deno.readFile already provides a Uint8Array
        name: "input_image.jpg",
      },
      prompt: ghibliPrompt,
      n: 1,
      size: "1024x1024",
      model: "dall-e-2",
    });
    console.log("[Test] OpenAI responded.");

    const newImageUrl = response.data[0]?.url;
    if (!newImageUrl) {
      throw new Error("OpenAI did not return an image URL.");
    }

    console.log(`[Test] Successfully generated image URL: ${newImageUrl}`);

    // Step 3: Download and save the generated image (this part is the same)
    console.log("[Test] Downloading generated image...");
    const finalImageResponse = await fetch(newImageUrl);
    const finalImageBlob = await finalImageResponse.blob();

    await ensureDir(outputDir);
    const timestamp = new Date().getTime();
    const outputPath = `${outputDir}/ghibli_version_${timestamp}.png`;

    await Deno.writeFile(
      outputPath,
      new Uint8Array(await finalImageBlob.arrayBuffer())
    );
    console.log(`✅ [Test] Success! Image saved to: ${outputPath}`);
  } catch (error) {
    console.error("❌ [Test] An error occurred:", error.message);
  }
}

// Remember to uncomment this line to run the test
//testGeneration();
