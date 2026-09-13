import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TournamentDetailScreen } from "@/screens/tournaments/TournamentDetailScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-svg", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: "Svg",
    Path: "Path",
    Circle: "Circle",
    Rect: "Rect",
    Line: "Line",
    Polyline: "Polyline",
  };
});

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) => selector({ user: { id: "u1", name: "Test User" }, token: "tok" }),
}));

const mockNavigation = { goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn(), replace: jest.fn() } as any;
// A tela le o torneio por useApi; antes havia dado fixo embutido nela.
const mockTorneio = {
  id: "t1",
  name: "Copa Verão 2026",
  description: "Torneio de vôlei de praia.",
  // A secao "Regras" so aparece quando ha regras: o campo e texto com uma por linha.
  rules: "Chegue 30 minutos antes.\nProibido vidro na areia.",
  eventType: "SINGLE",
  status: "REGISTRATION_OPEN",
  ownerId: "owner-1",
  owner: { id: "owner-1", name: "Marcos Costa", avatarUrl: null },
  imageUrl: null,
  categories: [
    { id: "c1", type: "MALE", format: "PAIR", modality: "BEACH", registrationPrice: 120, maxTeams: 16 },
    { id: "c2", type: "FEMALE", format: "PAIR", modality: "BEACH", registrationPrice: 120, maxTeams: 16 },
  ],
  stages: [
    {
      id: "s1",
      name: null,
      date: "2026-12-10T00:00:00.000Z",
      startTime: "2026-12-10T09:00:00.000Z",
      city: "Santos",
      state: "SP",
      address: "Av. Beira Mar, 100",
    },
  ],
  // A secao "Premiacao" so aparece com premio definido.
  prizePot: 5000,
  sponsors: [],
  _count: { registrations: 3 },
};

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: mockTorneio, loading: false, error: null, refetch: jest.fn() }),
}));

const mockRoute = { params: { id: "t1" } };

describe("TournamentDetailScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders tournament title", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Copa Verão 2026")).toBeTruthy();
  });

  it("renders open badge", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("INSCRIÇÕES ABERTAS")).toBeTruthy();
  });

  it("renders organizer", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Marcos Costa")).toBeTruthy();
    expect(getByText("Organizador")).toBeTruthy();
  });

  it("renders sections", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Sobre o torneio")).toBeTruthy();
    expect(getByText("Regras")).toBeTruthy();
    expect(getByText("Categorias · 2")).toBeTruthy();
    expect(getByText("Premiação")).toBeTruthy();
    expect(getByText("Times confirmados")).toBeTruthy();
    expect(getByText("Local")).toBeTruthy();
  });

  it("renders CTA button for non-owner", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Inscrever meu time")).toBeTruthy();
  });

  it("renders confirmed teams count", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    // Sem limite de vagas na etapa, a tela mostra a contagem em vez do percentual.
    expect(getByText("3 inscritos")).toBeTruthy();
  });

  it("navigates to registration on CTA press", () => {
    const { getByLabelText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByLabelText("Inscrever meu time"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Registration", expect.objectContaining({ tournamentId: "t1" }));
  });
});
