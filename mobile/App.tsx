// App.tsx
import React from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeBaseProvider } from "native-base";

import WelcomeScreen from "./screens/onboarding/WelcomeScreen";
import CreateAccountScreen from "./screens/onboarding/CreateAccountScreen"; // ✅ new file
import RecordScreen from "./screens/home/RecordScreen";
import VerifyCodeScreen from "./screens/onboarding/VerifyCodeScreen";
import CreateToonScreen from "./screens/onboarding/CreateToonScreen";
import DashboardScreen from "./screens/home/DashboardScreen";
import ProcessingScreen from "./screens/home/ProcessingScreen";
import ComicResultScreen from "./screens/home/ComicResultScreen";
import theme from "./theme";

// --- Optional stub until you build it
const LoginScreen = () => null;
//const VerifyCodeScreen = () => null; // will receive { phone } param

// ──────────────────────────────────────────────────────────────────────────────
// Navigation types
// ──────────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  Login: undefined;
  Record: undefined;
  VerifyCode: { phone: string };
  CreateToon: undefined;
  Dashboard: undefined;
  Processing: undefined;
  ComicResult: { urls: string[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ──────────────────────────────────────────────────────────────────────────────
// App entry
// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NativeBaseProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{ headerShown: false }}
        >
          {/* On-boarding */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <Stack.Screen name="CreateToon" component={CreateToonScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />

          {/* Main app */}
          <Stack.Screen name="Dashboard" component={DashboardScreen} />

          <Stack.Screen name="Record" component={RecordScreen} />
          <Stack.Screen name="Processing" component={ProcessingScreen} />
          <Stack.Screen name="ComicResult" component={ComicResultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NativeBaseProvider>
  );
}
