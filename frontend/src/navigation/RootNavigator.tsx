import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainNavigator } from "./MainNavigator";
import { RootStackParamList } from "./types";
import { TournamentDetailScreen } from "@/screens/tournaments/TournamentDetailScreen";
import { MyRegistrationsScreen } from "@/screens/registrations/MyRegistrationsScreen";
import { TournamentRegistrationScreen } from "@/screens/registrations/TournamentRegistrationScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
      <Stack.Screen name="Registration" component={TournamentRegistrationScreen} />
      <Stack.Screen name="MyRegistrations" component={MyRegistrationsScreen} />
    </Stack.Navigator>
  );
}
