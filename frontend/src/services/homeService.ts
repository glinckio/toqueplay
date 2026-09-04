import { api } from "./api";

export interface LiveMatchDTO {
  id: string;
  tournament: { id: string; name: string };
  round: string;
  court: string;
  currentSet: number;
  teamA: { id: string; name: string; initials: string };
  teamB: { id: string; name: string; initials: string };
  scoreA: number;
  scoreB: number;
  setScores: string;
  status: string;
}

export interface NearbyTournamentDTO {
  id: string;
  name: string;
  coverUrl: string | null;
  categoryFormat: string;
  status: string;
  distance: number;
  date: string;
  city: string;
}

export interface MyTournamentSummaryDTO {
  id: string;
  name: string;
  coverUrl: string | null;
  date: string;
  categoryFormat: string;
  registrationStatus: string;
}

export interface PendingFriendlyDTO {
  id: string;
  title: string;
  teamAName: string;
  teamBName: string;
  date: string;
  status: string;
}

export interface AcceptedFriendlyDTO {
  id: string;
  title: string;
  date: string;
  city: string | null;
  status: string;
  requester: { id: string; name: string; avatarUrl: string | null } | null;
  requesterTeam: { id: string; name: string; avatarUrl: string | null } | null;
  challenged: { id: string; name: string; avatarUrl: string | null } | null;
  challengedTeam: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface DashboardDTO {
  liveMatches: LiveMatchDTO[];
  nearbyTournaments: NearbyTournamentDTO[];
  myTournaments: MyTournamentSummaryDTO[];
  pendingFriendlies: PendingFriendlyDTO[];
  acceptedFriendlies: AcceptedFriendlyDTO[];
  unreadNotifications: number;
}

export interface FeedItemDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceId: string | null;
  createdAt: string;
}

export const homeService = {
  async getDashboard(): Promise<DashboardDTO> {
    const { data } = await api.get<DashboardDTO>("/home");
    return data;
  },

  async getFeed(): Promise<FeedItemDTO[]> {
    const { data } = await api.get<FeedItemDTO[]>("/feed");
    return data;
  },
};
