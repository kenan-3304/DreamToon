import { Alert } from "react-native";
import paywallActive from "@/context/PaywallContext";

function isNotToday(lastCreated: string | Date) {
  const today = new Date();
  const lastCreatedDate =
    typeof lastCreated === "string" ? new Date(lastCreated) : lastCreated;

  // This UTC comparison will now work correctly with the timestamptz column
  return (
    lastCreatedDate.getUTCDate() !== today.getUTCDate() ||
    lastCreatedDate.getUTCMonth() !== today.getUTCMonth() ||
    lastCreatedDate.getUTCFullYear() !== today.getUTCFullYear()
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

    // Enforce limit only if last_creation_date is today
    const todayCount =
      profile?.last_creation_date && !isNotToday(profile.last_creation_date)
        ? profile?.daily_creation_count || 0
        : 0;

    if (todayCount >= 3) {
      Alert.alert(
        "You have reached the creation limit for today",
        " Come back tomorrow for more"
      );
      return false;
    }

    return true;
  },
};
