import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "./_layout"; // Import the useSession hook from the layout
import { View, ActivityIndicator, StyleSheet } from "react-native";

const Index = () => {
  const { session, loading } = useSession();

  // While the session is loading, show a spinner.
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // If loading is finished and there is no session, redirect to the auth flow.
  if (!session) {
    return <Redirect href="/(auth)/WelcomeScreen" />;
  }

  // If loading is finished and there IS a session, redirect to the main app.
  return <Redirect href="/(tab)/" />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0A3C", // Match your app's theme
  },
});

export default Index;
