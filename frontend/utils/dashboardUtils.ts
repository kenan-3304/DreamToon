import { Alert } from "react-native";

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
    if (profile?.subscription_status === "free") {
      router.push({
        pathname: "/(modals)/PaywallScreen",
      });
      return false;
    }

    if (profile?.last_creation_date && isNotToday(profile.last_creation_date)) {
      try {
        updateProfile({ daily_creation_count: 0 });
      } catch (error) {
        console.error("Failed to reset daily creation count:", error);
      }
    }

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
