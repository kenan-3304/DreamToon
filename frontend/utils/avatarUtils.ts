import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system";

export const avatarUtils = {
  /**
   * Gets a signed URL for an avatar image stored in the private bucket
   * @param filePath The path to the file in the avatars bucket (e.g., "user-id/comic_123.png")
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Promise<string> The signed URL
   */
  async getSignedAvatarUrl(
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Failed to get signed avatar URL:", error);
      throw error;
    }
  },

  /**
   * Extracts the file path from a signed URL stored in the database
   * This is a helper function to convert stored signed URLs back to file paths
   * @param signedUrl The signed URL stored in the database
   * @returns string | null The file path or null if invalid
   */
  extractFilePathFromSignedUrl(signedUrl: string): string | null {
    try {
      // Parse the URL to extract the file path
      const url = new URL(signedUrl);
      const pathParts = url.pathname.split("/");

      // Find the index after 'storage/v1/object/sign/avatars/'
      const avatarsIndex = pathParts.findIndex((part) => part === "avatars");
      if (avatarsIndex === -1 || avatarsIndex + 1 >= pathParts.length) {
        return null;
      }

      // Extract everything after 'avatars/' but before the query parameters
      const filePath = pathParts.slice(avatarsIndex + 1).join("/");
      return filePath;
    } catch (error) {
      console.error("Error extracting file path from signed URL:", error);
      return null;
    }
  },

  /**
   * Refreshes a signed URL if it's expired or about to expire
   * @param currentSignedUrl The current signed URL
   * @param expiresIn Expiration time in seconds for the new URL
   * @returns Promise<string> The new signed URL
   */
  async refreshSignedAvatarUrl(
    currentSignedUrl: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const filePath = this.extractFilePathFromSignedUrl(currentSignedUrl);

    if (!filePath) {
      throw new Error("Invalid signed URL format");
    }

    return this.getSignedAvatarUrl(filePath, expiresIn);
  },

  async getMyAvatars() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User is not logged in.");
    }

    const { data, error } = await supabase
      .from("avatars")
      .select("avatar_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return data;
  },

  async createAvatar(
    imageUri: string,
    style: { name: string; prompt: string }
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!user || !session) throw new Error("User is not logged in");

    //gives some folder structure
    const originalFile = `${user?.id}/original_${Date.now()}.jpg`;

    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    //send original photo to avatars table and storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(originalFile, byteArray, {
        contentType: "image/jpeg",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from("avatars")
      .createSignedUrl(originalFile, 3600);

    if (urlError) throw urlError;

    const pythonResponse = await fetch(
      "https://dreamtoon-avatar.onrender.com/generate_avatar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          image_url: urlData.signedUrl,
          prompt: style.prompt,
        }),
      }
    );

    if (!pythonResponse.ok) {
      throw new Error(`Python backend failed ${pythonResponse.status}`);
    }

    const data = await pythonResponse.json();
    const base_64_image = data.b64_json;

    if (!base_64_image) {
      throw new Error("Python backend did not return a image");
    }

    //make sure the avatar is in right form there is some weirdness here
    const comicFileName = `${user?.id}/comic_${Date.now()}.png`;
    const tempComicPath = FileSystem.cacheDirectory + "temp_comic.png";
    await FileSystem.writeAsStringAsync(tempComicPath, base_64_image, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const res = await fetch(tempComicPath);
    const arrayBufferComic = await res.arrayBuffer();
    const byteArrayComic = new Uint8Array(arrayBufferComic);

    await supabase.storage
      .from("avatars")
      .upload(comicFileName, byteArrayComic, { contentType: "image/png" });

    //UPDATE AVATARS TABLE WITH PATHS

    await supabase.from("avatars").insert({
      user_id: user.id,
      style: style.name,
      avatar_path: comicFileName,
      original_photo_path: originalFile,
    });

    await supabase.from("unlocked_styles").upsert({
      user_id: user.id,
      style: style.name,
    });

    await supabase
      .from("profiles")
      .update({ last_avatar_created_at: new Date().toISOString() })
      .eq("id", user.id);

    return { newAvatarPath: comicFileName };
  },
};
