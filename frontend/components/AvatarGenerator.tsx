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
import * as FileSystem from "expo-file-system";
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
  const { user, updateProfile, session } = useUser();

  const validateFaceInImage = async (imageUri: string): Promise<boolean> => {
    //add face validation here
    return true;
  };

  const processImage = async (imageUri: string) => {
    try {
      // 2. Validate face
      const hasFace = await validateFaceInImage(imageUri);
      if (!hasFace) {
        Alert.alert("Error", "Please select an image with a clear face");
        return;
      }

      // Debug: Log user ID and file path
      console.log("User ID:", user?.id);
      console.log("User ID type:", typeof user?.id);

      // 3. Upload original photo to storage with proper folder structure
      const fileName = `${user?.id}/original_${Date.now()}.jpg`;
      console.log("File path:", fileName);

      console.log("imageUri:", imageUri);

      // Use arrayBuffer instead of blob for more reliable binary data handling
      const response = await fetch(imageUri);
      console.log("response.ok:", response.ok);

      // Get the image as arrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      console.log("arrayBuffer length:", arrayBuffer.byteLength);

      // Convert to Uint8Array
      const byteArray = new Uint8Array(arrayBuffer);
      console.log("byteArray length:", byteArray.length);

      console.log("About to upload file to storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, byteArray, {
          contentType: "image/jpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // 4. Get signed URL for the edge function
      const { data: urlData, error: urlError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      console.log("Signed URL for edge function:", urlData.signedUrl);

      // 5. Call Python Backend directly (no Edge Function needed)
      const pythonBackendUrl = "http://localhost:8000/generate_avatar"; // Adjust URL as needed

      console.log("Calling Python backend for image generation...");
      const pythonResponse = await fetch(pythonBackendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          image_url: urlData.signedUrl,
          prompt:
            "a vibrant, whimsical, and heartwarming portrait in the Studio Ghibli art style, with soft, painterly textures and a touch of fantasy.",
        }),
      });

      if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        console.error("Python backend error:", errorText);
        throw new Error(`Python backend failed: ${pythonResponse.status}`);
      }

      const data = await pythonResponse.json();
      const base64Image = data.b64_json;

      console.log(
        "Received base64 data length:",
        base64Image ? base64Image.length : 0
      );

      if (!base64Image) {
        throw new Error("Python backend did not return image data");
      }

      console.log("Image generated successfully by Python backend");

      // 6. Save comic avatar to storage with proper folder structure
      // 6. Save comic avatar to storage with proper folder structure
      // 6. Save comic avatar to storage by replicating the original upload flow
      const comicFileName = `${user?.id}/comic_${Date.now()}.png`;

      // Step A: Create a temporary file path in the app's cache
      const tempComicPath = FileSystem.cacheDirectory + "temp_comic.png";

      // Step B: Write the Base64 data to this new file
      await FileSystem.writeAsStringAsync(tempComicPath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("Saved comic to temporary file:", tempComicPath);

      // Step C: Read the new file back as binary data (just like the original)
      const res = await fetch(tempComicPath);
      const arrayBufferComic = await res.arrayBuffer();
      const byteArrayComic = new Uint8Array(arrayBufferComic);

      console.log("Read back comic byte array length:", byteArrayComic.length);

      // Step D: Upload the binary data to Supabase
      const { data: comicUploadData, error: comicUploadError } =
        await supabase.storage
          .from("avatars")
          .upload(comicFileName, byteArrayComic, {
            contentType: "image/png",
          });

      if (comicUploadError) {
        console.error("Comic upload error:", comicUploadError);
        throw comicUploadError;
      }
      // 7. Get signed URL for the comic avatar
      const { data: comicUrlData, error: comicUrlError } =
        await supabase.storage
          .from("avatars")
          .createSignedUrl(comicFileName, 3600 * 24 * 365); // 1 year expiry for avatar

      if (comicUrlError) throw comicUrlError;

      // 8. Update profile with file paths (not signed URLs)
      await updateProfile({
        avatar_url: comicFileName,
        original_photo_url: fileName,
      });

      onSuccess?.(comicFileName);
      Alert.alert("Success", "Your comic avatar has been generated!");
    } catch (error: any) {
      console.error("Image processing error:", error);
      const errorMessage = error.message || "Failed to process image";
      onError?.(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result;

      if (source === "camera") {
        // Check camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Camera permission is required to take a photo."
          );
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        // Check media library permissions
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Media library permission is required to select a photo."
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Image picker error:", error);
      const errorMessage = error.message || "Failed to pick image";
      onError?.(errorMessage);
      Alert.alert("Error", errorMessage);
      setIsGenerating(false);
    }
  };

  const generateAvatar = async () => {
    setIsGenerating(true);

    // Show options to user
    Alert.alert("Choose Photo", "How would you like to get your photo?", [
      {
        text: "Take Photo",
        onPress: () => pickImage("camera"),
      },
      {
        text: "Choose from Gallery",
        onPress: () => pickImage("gallery"),
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => setIsGenerating(false),
      },
    ]);
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
