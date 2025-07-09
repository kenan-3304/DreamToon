import React, { useState, useEffect } from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { avatarUtils } from "../utils/avatarUtils";

interface AvatarProps {
  avatarUrl?: string | null;
  size?: number;
  style?: any;
}

export const Avatar: React.FC<AvatarProps> = ({
  avatarUrl,
  size = 80,
  style,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadSignedUrl = async () => {
      if (!avatarUrl) {
        setSignedUrl(null);
        return;
      }

      // If it's already a signed URL (starts with http), use it directly
      if (avatarUrl.startsWith("http")) {
        setSignedUrl(avatarUrl);
        return;
      }

      // If it's a file path, generate a signed URL
      try {
        setLoading(true);
        setError(false);
        const url = await avatarUtils.getSignedAvatarUrl(avatarUrl, 3600 * 24); // 24 hours
        setSignedUrl(url);
      } catch (err) {
        console.error("Failed to load avatar:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadSignedUrl();
  }, [avatarUrl]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  };

  if (loading) {
    return (
      <View style={[styles.container, containerStyle, styles.loadingContainer]}>
        <ActivityIndicator color="#00EAFF" size="small" />
      </View>
    );
  }

  if (error || !signedUrl) {
    return (
      <View
        style={[styles.container, containerStyle, styles.placeholderContainer]}
      >
        <Ionicons name="person" size={size * 0.5} color="#00EAFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: signedUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,234,255,0.1)",
    borderWidth: 2,
    borderColor: "#00EAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  placeholderContainer: {
    backgroundColor: "rgba(0,234,255,0.1)",
  },
});
