import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Button,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useUser } from "../../context/UserContext";
import { avatarUtils } from "../../utils/avatarUtils";
import { Avatar } from "../../components/Avatar"; // Your existing component
import { StyleSelector } from "../../components/StyleSelector"; // We will create this next
import * as ImagePicker from "expo-image-picker";

export const AvatarStudioScreen = () => {
  const { profile } = useUser();
  const [avatars, setAvatars] = useState<{ avatar_path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showStyleSelector, setShowStyleSelector] = useState(false);

  // Fetch existing avatars on mount
  useEffect(() => {
    avatarUtils.getMyAvatars().then((data) => {
      setAvatars(data || []);
      setLoading(false);
    });
  }, []);

  // Cooldown logic
  const isCooldownActive = () => {
    if (!profile?.last_avatar_created_at) return false;
    const lastDate = new Date(profile.last_avatar_created_at);
    const now = new Date();
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24 * 7; // 7 days
  };

  const handleCreateFlow = async (style) => {
    setShowStyleSelector(false);
    // 1. Pick image (using logic from old AvatarGenerator.tsx)
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    // 2. Start creation
    setIsCreating(true);
    try {
      await avatarUtils.createAvatar(result.assets[0].uri, style);
      // Refresh the gallery
      const updatedAvatars = await avatarUtils.getMyAvatars();
      setAvatars(updatedAvatars || []);
    } catch (e) {
      // Handle error
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      <Text>Your Avatar Gallery</Text>
      <FlatList
        data={avatars}
        renderItem={({ item }) => (
          <Avatar avatarUrl={item.avatar_path} size={100} />
        )}
        keyExtractor={(item) => item.avatar_path}
        numColumns={3}
      />

      {isCooldownActive() ? (
        <Text>Next avatar available in [calculate time]...</Text>
      ) : (
        <Button
          title="Create New Avatar"
          onPress={() => setShowStyleSelector(true)}
          disabled={isCreating}
        />
      )}

      <Modal visible={showStyleSelector} animationType="slide">
        <StyleSelector onStyleSelect={handleCreateFlow} />
        <Button title="Cancel" onPress={() => setShowStyleSelector(false)} />
      </Modal>
    </View>
  );
};
