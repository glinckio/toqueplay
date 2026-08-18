import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { MainTabParamList } from "./types";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { ExploreScreen } from "@/screens/tournaments/ExploreScreen";

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
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Create">{() => <PlaceholderScreen name="Criar" />}</Tab.Screen>
      <Tab.Screen name="Live">{() => <PlaceholderScreen name="Ao Vivo" />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <PlaceholderScreen name="Perfil" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
