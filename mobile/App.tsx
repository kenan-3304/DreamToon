import React from "react";
import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeBaseProvider, extendTheme } from "native-base";
import RecordScreen from "./screens/RecordScreen";

// ──────────────────────────────────────────────────────────────────────────────
// Theme (minimal)
// ──────────────────────────────────────────────────────────────────────────────
const theme = // in your theme extension
  extendTheme({
    colors: {
      background: { 500: "#1A153A" }, // deep navy-purple
      ring: { 500: "#8A46FF" }, // bright purple glow
      text: { 500: "#FFFFFF" }, // off-white
    },
  });

// ──────────────────────────────────────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Record: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NativeBaseProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Record"
            component={RecordScreen}
            options={{ title: "Record Dream" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </NativeBaseProvider>
  );
}
