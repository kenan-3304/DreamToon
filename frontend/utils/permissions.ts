// utils/permissions.ts
import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";

export async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Only ask if permissions have not already been determined.
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Handle the case where permission is still not granted
  if (finalStatus !== "granted") {
    Alert.alert(
      "Permission Required",
      "To get alerts when your comics are ready, please enable notifications in your settings.",
      [
        { text: "Cancel", style: "cancel" },
        // This button takes them directly to the app's settings
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  // On Android, you also need to create a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return true;
}
