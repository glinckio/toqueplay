import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { MainTabParamList } from "./types";

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0C0A12" }}>
      <Text style={{ color: "#F5F3FA", fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 }}>{name}</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="Home">{() => <PlaceholderScreen name="Home" />}</Tab.Screen>
      <Tab.Screen name="Explore">{() => <PlaceholderScreen name="Explorar" />}</Tab.Screen>
      <Tab.Screen name="Create">{() => <PlaceholderScreen name="Criar" />}</Tab.Screen>
      <Tab.Screen name="Live">{() => <PlaceholderScreen name="Ao Vivo" />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <PlaceholderScreen name="Perfil" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
