import { Alert } from "react-native";
import paywallActive from "@/context/PaywallContext";

function isNotToday(lastCreated: string | Date) {
  const today = new Date();
  const lastCreatedDate =
    typeof lastCreated === "string" ? new Date(lastCreated) : lastCreated;

  return (
    lastCreatedDate.getDate() !== today.getDate() ||
    lastCreatedDate.getMonth() !== today.getMonth() ||
    lastCreatedDate.getFullYear() !== today.getFullYear()
  );
}

export const dashboardUtils = {
  async canUpload(
    profile: any,
    router: any,
    updateProfile: (data: any) => void
  ): Promise<boolean> {
    if (profile?.subscription_status === "free" && paywallActive) {
      router.push({
        pathname: "/(modals)/PaywallScreen",
      });
      return false;
    }

    if (!profile?.display_avatar_path) {
      Alert.alert("Generate a Avatar before creating a comic");
      return false;
    }

    // Remove the redundant reset logic - UserContext will handle this when incrementing
    // The daily_creation_count will be automatically reset when incrementDailyCreationCount is called

    if (profile?.daily_creation_count && profile?.daily_creation_count >= 3) {
      Alert.alert(
        "You have reached the creation limit for today",
        " Come back tomorrow for more"
      );
      return false;
    }

    return true;
  },
};
