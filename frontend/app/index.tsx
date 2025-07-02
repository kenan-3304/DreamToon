import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  NavigationIndependentTree,
  DefaultTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./(auth)/AuthScreen";
import WelcomeScreen from "./(auth)/WelcomeScreen";
import CreateToonScreen from "./(tab)/CreateToonScreen";
import DashboardScreen from "./(tab)/DashboardScreen";

// Define the types for your navigation stack
export type RootStackParamList = {
  Login: undefined;
  WelcomeScreen: undefined;
  CreateToonScreen: undefined;
  DashboardScreen: undefined;
};

const MyTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "#0D0A3C" }, // dark fallback
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationIndependentTree>
        <NavigationContainer theme={MyTheme}>
          <Stack.Navigator
            initialRouteName="WelcomeScreen"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="CreateToonScreen"
              component={CreateToonScreen}
            />
            <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </SafeAreaProvider>
  );
}
