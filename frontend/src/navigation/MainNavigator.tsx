import React, { useState, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "./types";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { ExploreScreen } from "@/screens/tournaments/ExploreScreen";
import { MyFriendliesScreen } from "@/screens/friendlies/MyFriendliesScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { CreateActionSheet } from "@/components/composed/CreateActionSheet";
import { View } from "react-native";

function CreatePlaceholder() {
  return <View style={{ flex: 1, backgroundColor: "#0C0A12" }} />;
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <BottomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        screenListeners={{
          tabPress: (e) => {
            if (e.target?.startsWith("Create")) {
              e.preventDefault();
              setShowCreateSheet(true);
            }
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Explore" component={ExploreScreen} />
        <Tab.Screen name="Create" component={CreatePlaceholder} />
        <Tab.Screen name="Friendlies" component={MyFriendliesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      <CreateActionSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
      />
    </>
  );
}
