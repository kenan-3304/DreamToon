import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

/**
 * 💡 2. ADD THIS HELPER FUNCTION
 * Resizes and compresses an image to make it suitable for upload.
 * @param uri The original image file URI.
 * @returns The URI of the manipulated, compressed image.
 */
async function compressImage(
  uri: string
): Promise<{ uri: string; size?: number }> {
  console.log("--- Compressing and downscaling image ---");

  // First, resize to 512x512 (square) to ensure consistent dimensions
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { resize: { width: 512, height: 512 } }, // Force square dimensions
    ],
    {
      compress: 0.7, // Add compression (0.7 = 70% quality) to create slight blur effect
      format: ImageManipulator.SaveFormat.PNG,
    }
  );

  // Let's get the new file size to confirm it worked
  const newFileInfo = await FileSystem.getInfoAsync(result.uri);
  console.log(
    `--- Image processed. New size: ${
      newFileInfo.exists && "size" in newFileInfo ? newFileInfo.size : "unknown"
    } bytes. ---`
  );

  return {
    uri: result.uri,
    size:
      newFileInfo.exists && "size" in newFileInfo
        ? newFileInfo.size
        : undefined,
  };
}

export const avatarUtils = {
  /**
   * Gets a signed URL for a single avatar path.
   * This is used by the Avatar component to display individual avatars.
   */
  async getSignedAvatarUrl(
    avatarPath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(avatarPath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },

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
    if (!session) throw new Error("User is not logged in");

    // 1. Compress and encode the user's photo (no change)
    const { uri: compressedImageUri } = await compressImage(imageUri);
    const base64Image = await FileSystem.readAsStringAsync(compressedImageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const resDebug = await fetch(
      "https://dreamtoon.onrender.com/debug-worker/",
      {
        method: "GET",
      }
    );
    const fastApiResponse = await fetch(
      "https://dreamtoon.onrender.com/generate-avatar/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_photo_b64: base64Image,
          prompt: style.prompt,
          name: style.name,
        }),
      }
    );

    console.log(
      `--- Backend responded with status: ${fastApiResponse.status} ---`
    );

    // If the response is not OK, throw an error. Otherwise, we're done!
    if (!fastApiResponse.ok) {
      const errorBody = await fastApiResponse.json();
      console.error("--- BACKEND ERROR ---", errorBody);
      throw new Error(
        `Avatar generation failed: ${
          errorBody.detail || "Unknown server error"
        }`
      );
    }

    // No need to handle the response body, the backend did everything.
    return { success: true };
  },
};
