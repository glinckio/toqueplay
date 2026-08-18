export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  VerifyEmail: { email: string };
  TwoFactor: { temporaryToken: string };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Create: undefined;
  Live: undefined;
  Profile: undefined;
};

export type VisitorTabParamList = {
  VisitorHome: undefined;
  VisitorExplore: undefined;
  VisitorLogin: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  TournamentDetail: { id: string };
  CreateTournament: undefined;
  ManageTeams: undefined;
  TeamDetail: { id: string };
  TeamInvite: { id: string };
  Registration: { tournamentId: string; tournamentName?: string; tournamentLocation?: string };
  MyRegistrations: undefined;
  ManageRegistrations: { tournamentId: string };
  Bracket: { tournamentId: string };
  Referee: undefined;
  MatchLive: { matchId: string };
  MatchResult: { matchId: string };
  CreateFriendly: undefined;
  MyFriendlies: undefined;
  FriendlyDetail: { id: string };
  Notifications: undefined;
  EditProfile: undefined;
  Privacy: undefined;
  MyTournaments: undefined;
};
