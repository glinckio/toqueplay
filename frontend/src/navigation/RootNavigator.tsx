import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainNavigator } from "./MainNavigator";
import { RootStackParamList } from "./types";
import { TournamentDetailScreen } from "@/screens/tournaments/TournamentDetailScreen";
import { MyRegistrationsScreen } from "@/screens/registrations/MyRegistrationsScreen";
import { TournamentRegistrationScreen } from "@/screens/registrations/TournamentRegistrationScreen";
import { ManageTeamsScreen } from "@/screens/teams/ManageTeamsScreen";
import { TeamDetailScreen } from "@/screens/teams/TeamDetailScreen";
import { TeamInviteScreen } from "@/screens/teams/TeamInviteScreen";
import { CreateTeamScreen } from "@/screens/teams/CreateTeamScreen";
import { RefereeScreen } from "@/screens/matches/RefereeScreen";
import { MatchResultScreen } from "@/screens/matches/MatchResultScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainNavigator} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
      <Stack.Screen name="Registration" component={TournamentRegistrationScreen} />
      <Stack.Screen name="MyRegistrations" component={MyRegistrationsScreen} />
      <Stack.Screen name="ManageTeams" component={ManageTeamsScreen} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      <Stack.Screen name="TeamInvite" component={TeamInviteScreen} />
      <Stack.Screen name="CreateTeam" component={CreateTeamScreen} />
      <Stack.Screen name="Referee" component={RefereeScreen} />
      <Stack.Screen name="MatchResult" component={MatchResultScreen} />
    </Stack.Navigator>
  );
}
