import { supabase } from "../utils/supabase"; // Adjust this import path to where you created your Supabase client

export const profileService = {
  /**
   * Updates the profile for the currently logged-in user.
   * @param updates An object containing the fields to update, e.g., { character_design: "..." }
   */
  async updateProfile(updates: { character_design: string }) {
    // Get the currently logged-in user from Supabase auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not found. Please log in again.");
    }

    // Perform the update on the 'profiles' table where the id matches the user's id
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      // Throw the error to be caught by the component
      throw error;
    }

    console.log("Profile updated successfully!");
  },
};
