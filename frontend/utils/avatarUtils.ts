import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system";

/**
 * A helper function to upload a Base64 encoded string as a file to Supabase Storage.
 * This is needed because the FastAPI server returns the generated image as Base64.
 * @param base64String The Base64 encoded image data.
 * @param fileName The desired path/filename in the Supabase bucket.
 */
async function uploadBase64ToSupabase(base64String: string, fileName: string) {
  const tempPath = FileSystem.cacheDirectory + "temp_avatar_upload.png";
  try {
    // Write the base64 string to a temporary file in the app's cache directory
    await FileSystem.writeAsStringAsync(tempPath, base64String, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // In React Native, we need to fetch the file URI to get its blob representation
    const response = await fetch(tempPath);
    const blob = await response.blob();

    // Upload the blob to Supabase Storage
    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { contentType: "image/png", upsert: false });

    if (error) throw error;
  } finally {
    // Clean up the temporary file to save space, whether the upload succeeded or failed
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
  }
}

export const avatarUtils = {
  /**
   * Fetches all of a user's avatars and their corresponding signed URLs in one bulk operation.
   * This is highly efficient for displaying a gallery.
   */
  async getMyAvatarsWithSignedUrls(): Promise<
    { path: string; signedUrl: string }[]
  > {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User is not logged in.");

    // 1. Get all the file paths from the database
    const { data: pathsData, error: pathsError } = await supabase
      .from("avatars")
      .select("avatar_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (pathsError) throw pathsError;
    if (!pathsData || pathsData.length === 0) return [];

    const paths = pathsData.map((p) => p.avatar_path);

    // 2. Get all signed URLs in a single API call for efficiency
    const { data: signedUrlsData, error: signedUrlsError } =
      await supabase.storage.from("avatars").createSignedUrls(paths, 3600 * 24); // 24-hour expiry

    if (signedUrlsError) throw signedUrlsError;

    // 3. Map the paths and URLs together for stable keys in the UI
    // The filter(item => item.path) is a safeguard against any null paths
    return signedUrlsData
      .filter((item) => item.path)
      .map((item) => ({ path: item.path!, signedUrl: item.signedUrl }));
  },

  /**
   * The main function to create a new avatar.
   * It sends the user's photo directly to the FastAPI backend and then finalizes the process.
   */
  async createAvatar(
    imageUri: string,
    style: { name: string; prompt: string }
  ) {
    console.log("--- 1. Starting createAvatar process ---");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!session || !user) throw new Error("User is not logged in");

    let comicFileName = ""; // Define here to be accessible in the catch block

    console.log(
      `--- 2. User authenticated: ${user.id}. Preparing to send request. ---`
    );
    console.log(`--- Image URI: ${imageUri} ---`);
    console.log(`--- Style Name: ${style.name} ---`);

    try {
      // 1. Construct FormData to send the image and prompt to the backend
      const formData = new FormData();

      console.log("--- 3. Fetching image blob from URI... ---");

      const response = await fetch(imageUri);
      const blob = await response.blob();

      if (!blob) {
        throw new Error("Failed to create blob from image URI.");
      }
      console.log(
        `--- 4. Image blob created successfully. Size: ${blob.size} bytes. ---`
      );

      formData.append("user_photo", blob, "user_photo.jpg");
      formData.append("prompt", style.prompt);

      console.log(
        "--- 5. FormData prepared. Making fetch request to backend... ---"
      );

      // 2. Call your consolidated FastAPI backend
      // IMPORTANT: Replace with your actual Render URL

      const fastApiResponse = await fetch(
        "https://dreamtoon.onrender.com/generate-avatar/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      console.log(
        `--- 6. Backend responded with status: ${fastApiResponse.status} ---`
      );

      if (!fastApiResponse.ok) {
        const errorBody = await fastApiResponse.json();
        console.error("--- BACKEND ERROR ---", errorBody);

        throw new Error(
          `Avatar generation failed: ${
            errorBody.detail || "Unknown server error"
          }`
        );
      }

      const result = await fastApiResponse.json();
      const base64Image = result.b64_json;

      // 3. Upload the generated avatar to Supabase Storage
      comicFileName = `${user.id}/comic_${Date.now()}.png`;
      await uploadBase64ToSupabase(base64Image, comicFileName);

      // 4. Finalize the creation by calling the secure Edge Function
      const { error: invokeError } = await supabase.functions.invoke(
        "finalize-avatar",
        {
          body: {
            styleName: style.name,
            avatarPath: comicFileName,
            // The original photo is no longer uploaded to storage, so we pass a placeholder.
            // You could remove this from the Edge Function if it's no longer needed.
            originalPath: "client_direct_upload",
          },
        }
      );

      if (invokeError) throw invokeError;

      return { newAvatarPath: comicFileName };
    } catch (error) {
      // If anything fails, try to clean up the generated avatar file if it was created
      if (comicFileName) {
        console.log(
          "Creation failed, attempting to clean up orphaned avatar file..."
        );
        await supabase.storage.from("avatars").remove([comicFileName]);
      }
      // Re-throw the error so the UI can display it
      throw error;
    }
  },
};
