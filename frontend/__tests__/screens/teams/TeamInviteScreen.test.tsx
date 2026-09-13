import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { TeamInviteScreen } from "@/screens/teams/TeamInviteScreen";

// A tela busca os convites pendentes e casa pelo id da rota. Antes tinha dado fixo embutido.
const mockConvites = [
  {
    id: "inv-1",
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    inviter: { name: "Rafael Silva" },
    team: {
      id: "team-1",
      name: "Beach Titans",
      avatarUrl: null,
      members: [
        { id: "m1", user: { id: "u1", name: "Marcos Silva", avatarUrl: null }, isCaptain: true },
        { id: "m2", user: { id: "u2", name: "Ana Costa", avatarUrl: null }, isCaptain: false },
        { id: "m3", user: { id: "u3", name: "João Ferreira", avatarUrl: null }, isCaptain: false },
      ],
    },
  },
];

jest.mock("@/services/teamsService", () => ({
  teamsService: {
    getPendingInvitations: jest.fn().mockResolvedValue([]),
    acceptInvitation: jest.fn().mockResolvedValue({}),
    rejectInvitation: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: mockConvites, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { id: "inv-1", teamName: "Beach Titans", teamInitials: "BT", inviterName: "Marcos Silva" } };

describe("TeamInviteScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders invite header and team info", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Convite de time")).toBeTruthy();
    expect(getByText("Você foi convidado!")).toBeTruthy();
    expect(getByText("Beach Titans")).toBeTruthy();
  });

  it("renders team members", () => {
    const { getByText, getAllByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Membros atuais")).toBeTruthy();
    expect(getAllByText("Marcos Silva").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Ana Costa")).toBeTruthy();
    expect(getByText("João Ferreira")).toBeTruthy();
  });

  it("renders accept and reject buttons", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Aceitar")).toBeTruthy();
    expect(getByText("Recusar")).toBeTruthy();
  });

  it("shows expiry info", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("6 dias")).toBeTruthy();
  });

  // Aceitar chama a API antes de trocar de passo, entao a comemoracao entra de forma assincrona.
  it("transitions to the celebration view on accept", async () => {
    const { getByText, findByText } = render(
      <TeamInviteScreen navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.press(getByText("Aceitar"));
    expect(await findByText("Convite aceito")).toBeTruthy();
  });

  it("calls goBack on reject", async () => {
    const { getByText } = render(
      <TeamInviteScreen navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.press(getByText("Recusar"));
    await waitFor(() => expect(mockNavigation.goBack).toHaveBeenCalled());
  });
});
