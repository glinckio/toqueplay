import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { VisitorTabParamList } from "./types";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { VisitorHomeScreen } from "@/screens/home/VisitorHomeScreen";
import { ExploreScreen } from "@/screens/tournaments/ExploreScreen";

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
      tabBar={(props) => <BottomTabBar {...props} isVisitor />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="VisitorHome" component={VisitorHomeScreen} />
      <Tab.Screen name="VisitorExplore" component={ExploreScreen} />
      <Tab.Screen name="VisitorLogin">{() => <PlaceholderScreen name="Entrar" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
