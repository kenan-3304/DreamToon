import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Alert } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useRouter } from "expo-router";
import { useUser } from "@/context/UserContext";
const PaywallScreen: React.FC = () => {
  const router = useRouter();
  const { session } = useUser(); // Get the current user session

  useEffect(() => {
    const presentPaywall = async () => {
      if (!session?.user) {
        Alert.alert("Error", "You must be logged in to start a trial.");
        router.replace("/(auth)/AuthScreen");
        return;
      }

      try {
        // Log in to RevenueCat to link the user to the purchase
        await Purchases.logIn(session.user.id);

        // Present the pre-configured paywall from the RevenueCat dashboard
        const paywallResult: PAYWALL_RESULT =
          await RevenueCatUI.presentPaywall();

        // Handle the result of the user's interaction with the paywall
        switch (paywallResult) {
          case PAYWALL_RESULT.PURCHASED:
          case PAYWALL_RESULT.RESTORED:
            // User successfully subscribed or restored.
            // A webhook will handle updating your database in the background.
            // Navigate them into the main app.
            router.replace("/(tab)/");
            break;
          case PAYWALL_RESULT.CANCELLED:
            // User closed the paywall. Navigate them back.
            if (router.canGoBack()) {
              router.back();
            } else {
              // Fallback if there's no screen to go back to
              router.replace("/(auth)/AuthScreen");
            }
            break;
          case PAYWALL_RESULT.ERROR:
            Alert.alert(
              "Error",
              "An unexpected error occurred. Please try again."
            );
            if (router.canGoBack()) router.back();
            break;
          default:
            if (router.canGoBack()) router.back();
            break;
        }
      } catch (e) {
        Alert.alert("Error Presenting Paywall", (e as Error).message);
        if (router.canGoBack()) router.back();
      }
    };

    presentPaywall();
  }, [session, router]);

  // This screen will just show a loading spinner while the native paywall UI is active.
  // The footer with manual links has been removed as it's handled by RevenueCat's UI.
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0A3C",
  },
});

export default PaywallScreen;
