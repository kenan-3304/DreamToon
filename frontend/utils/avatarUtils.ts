import { supabase } from "./supabase";

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
};
