import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainNavigator } from "./MainNavigator";
import { RootStackParamList } from "./types";
import { TournamentDetailScreen } from "@/screens/tournaments/TournamentDetailScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
    </Stack.Navigator>
  );
}
