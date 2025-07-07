import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  NavigationIndependentTree,
  DefaultTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "react-native";

import LoginScreen from "./(auth)/AuthScreen";
import WelcomeScreen from "./(auth)/WelcomeScreen";
import CreateToonScreen from "./(tab)/CreateToonScreen";
import EnhancedDashboardScreen from "./(tab)/EnhancedDashboardScreen";

// Define the types for your navigation stack
export type RootStackParamList = {
  Login: undefined;
  WelcomeScreen: undefined;
  CreateToonScreen: undefined;
  EnhancedDashboardScreen: undefined;
};

const MyTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "#0D0A3C" }, // dark fallback
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0D0A3C"
        translucent
      />
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
            <Stack.Screen
              name="EnhancedDashboardScreen"
              component={EnhancedDashboardScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </SafeAreaProvider>
  );
}
