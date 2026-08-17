import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { VisitorTabParamList } from "./types";

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C0A12" }}>
      <Text style={{ color: "#F5F3FA", fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 }}>{name}</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator<VisitorTabParamList>();

export function VisitorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="VisitorHome">{() => <PlaceholderScreen name="Início" />}</Tab.Screen>
      <Tab.Screen name="VisitorExplore">{() => <PlaceholderScreen name="Explorar" />}</Tab.Screen>
      <Tab.Screen name="VisitorLogin">{() => <PlaceholderScreen name="Entrar" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
