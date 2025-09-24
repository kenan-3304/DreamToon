// In app/index.tsx

import React from "react";
import { Redirect } from "expo-router";

const StartPage = () => {
  // By the time this screen is shown, the root layout has already handled
  // the loading state and redirected any logged-out users.
  // Therefore, if we are here, we must be logged in.
  // Redirect to the main tab navigator.
  return <Redirect href="/(tab)" />;
};

export default StartPage;
