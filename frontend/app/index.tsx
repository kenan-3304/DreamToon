import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationIndependentTree } from "@react-navigation/native";

import LoginScreen from "./(auth)/AuthScreen";
import WelcomeScreen from "./(auth)/WelcomeScreen";
import CreateToonScreen from "./(tab)/CreateToonScreen";

// Define the types for your navigation stack
export type RootStackParamList = {
  Login: undefined;
  WelcomeScreen: undefined;
  CreateToonScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="WelcomeScreen"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="CreateToonScreen" component={CreateToonScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
