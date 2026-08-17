import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text } from "react-native";
import { AuthStackParamList } from "./types";

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C0A12" }}>
      <Text style={{ color: "#F5F3FA", fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 }}>{name}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">{() => <PlaceholderScreen name="Login" />}</Stack.Screen>
      <Stack.Screen name="Register">{() => <PlaceholderScreen name="Register" />}</Stack.Screen>
      <Stack.Screen name="ForgotPassword">{() => <PlaceholderScreen name="Forgot Password" />}</Stack.Screen>
      <Stack.Screen name="VerifyEmail">{() => <PlaceholderScreen name="Verify Email" />}</Stack.Screen>
      <Stack.Screen name="TwoFactor">{() => <PlaceholderScreen name="2FA" />}</Stack.Screen>
    </Stack.Navigator>
  );
}
