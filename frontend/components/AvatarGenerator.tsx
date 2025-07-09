import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../utils/supabase";
import { useUser } from "../context/UserContext";

interface AvatarGeneratorProps {
  onSuccess?: (avatarUrl: string) => void;
  onError?: (error: string) => void;
}

export const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({
  onSuccess,
  onError,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user, updateProfile } = useUser();

  const validateFaceInImage = async (imageUri: string): Promise<boolean> => {
    //add face validation here
    return true;
  };

  const generateAvatar = async () => {
    try {
      setIsGenerating(true);

      // 1. Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // 2. Validate face
        const hasFace = await validateFaceInImage(imageUri);
        if (!hasFace) {
          Alert.alert("Error", "Please select an image with a clear face");
          return;
        }

        // 3. Upload original photo to storage
        const fileName = `${user?.id}_original_${Date.now()}.jpg`;
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        // 4. Get public URL
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        // 5. Call Edge Function
        const { data, error } = await supabase.functions.invoke(
          "generate_avatar",
          {
            body: { image_url: urlData.publicUrl },
          }
        );

        if (error) throw error;

        // 6. Save comic avatar to storage
        const comicFileName = `${user?.id}_comic_${Date.now()}.png`;
        const comicBlob = await fetch(
          `data:image/png;base64,${data.b64_json}`
        ).then((r) => r.blob());

        const { data: comicUploadData, error: comicUploadError } =
          await supabase.storage
            .from("avatars")
            .upload(comicFileName, comicBlob);

        if (comicUploadError) throw comicUploadError;

        // 7. Get comic avatar URL
        const { data: comicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(comicFileName);

        // 8. Update profile
        await updateProfile({
          avatar_url: comicUrlData.publicUrl,
          original_photo_url: urlData.publicUrl,
        });

        onSuccess?.(comicUrlData.publicUrl);
        Alert.alert("Success", "Your comic avatar has been generated!");
      }
    } catch (error: any) {
      console.error("Avatar generation error:", error);
      const errorMessage = error.message || "Failed to generate avatar";
      onError?.(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View>
      <Pressable
        onPress={generateAvatar}
        disabled={isGenerating}
        style={[styles.button, isGenerating && styles.buttonDisabled]}
      >
        {isGenerating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Generate Comic Avatar</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#00EAFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
