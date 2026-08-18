import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStackParamList } from "./types";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/auth/ResetPasswordScreen";
import { VerifyEmailScreen } from "@/screens/auth/VerifyEmailScreen";
import { TwoFactorScreen } from "@/screens/auth/TwoFactorScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
    </Stack.Navigator>
  );
}
