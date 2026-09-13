import React from "react";
import { render } from "@testing-library/react-native";
import { HomeScreen } from "@/screens/home/HomeScreen";

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/stores/authStore", () => {
  const store = {
    user: { name: "Lucas Mendes", email: "lucas@test.com", avatarUrl: null },
    isAuthenticated: true,
    _hasHydrated: true,
    getState: () => store,
    setUser: jest.fn(),
  };
  return {
    useAuthStore: (selector: any) => selector(store),
  };
});

const mockDashboard = {
  liveMatches: [
    {
      id: "match-1",
      tournament: { name: "Copa Verão" },
      round: "Semifinal",
      court: "Quadra 1",
      currentSet: 3,
      teamA: { initials: "SR", name: "Silva & Rocha", color: "#7C3AED" },
      teamB: { initials: "CL", name: "Costa & Lima", color: "#241B38" },
      scoreA: 2,
      scoreB: 1,
      setScores: "25-21, 20-25, 15-12",
    },
  ],
  nearbyTournaments: [
    {
      id: "t1",
      name: "Copa Praia Grande",
      distance: 2.3,
      coverUrl: null,
      categoryFormat: "PAIR",
      date: "15 de ago",
      city: "Praia Grande",
    },
    {
      id: "t2",
      name: "Circuito Litoral",
      distance: 5.1,
      coverUrl: null,
      categoryFormat: "PAIR",
      date: "20 de ago",
      city: "Santos",
    },
  ],
  myTournaments: [
    {
      id: "t3",
      name: "Circuito Litoral",
      coverUrl: null,
      date: "22 de ago",
      categoryFormat: "Dupla Masculina",
      registrationStatus: "PAID",
    },
  ],
  unreadNotifications: 0,
};

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    data: mockDashboard,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

// Teste de tela nao deve depender do service real: mocka o que a Home consome.
jest.mock("@/services/matchesService", () => ({
  matchesService: { findRefereeMine: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/services/tournamentsService", () => ({
  tournamentsService: {
    findRefereeMine: jest.fn().mockResolvedValue([]),
    getBanners: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@/services/homeService", () => ({
  homeService: { getDashboard: jest.fn() },
}));

jest.mock("@/services/usersService", () => ({
  usersService: {
    getProfile: () => Promise.resolve({ avatarUrl: null }),
    updateLocation: () => Promise.resolve(),
  },
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: () => Promise.resolve({ status: "denied" }),
  getCurrentPositionAsync: () => Promise.resolve({ coords: { latitude: 0, longitude: 0 } }),
}));

// Precisa cobrir tudo que a tela e o Icon usam: primitivo faltando vira undefined e o React
// quebra com "Cannot read properties of undefined (reading 'displayName')".
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Svg: "Svg",
  Path: "Path",
  Circle: "Circle",
  Rect: "Rect",
  Line: "Line",
  Polyline: "Polyline",
  G: "G",
  Defs: "Defs",
  Stop: "Stop",
  LinearGradient: "LinearGradient",
}));

describe("HomeScreen", () => {
  // O gate de localizacao usa uma flag de modulo: ele abre so no primeiro render da sessao de
  // teste, e tem tempo minimo de exibicao. Por isso este caso espera mais que o padrao.
  it("renders the home header", async () => {
    const { findByText } = render(<HomeScreen />);
    expect(await findByText("Bora jogar", {}, { timeout: 5000 })).toBeTruthy();
  });

  it("renders live match section with tournament name", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Copa Verão")).toBeTruthy();
    expect(getByText("Assistir agora")).toBeTruthy();
  });

  it("renders live badge with set info", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("AO VIVO · SET 3")).toBeTruthy();
  });

  it("renders team names in score capsule", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Costa & Lima")).toBeTruthy();
  });

  it("renders nearby tournaments section", () => {
    const { getByText, getAllByText } = render(<HomeScreen />);
    expect(getByText("Torneios próximos")).toBeTruthy();
    expect(getAllByText("Copa Praia Grande").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("Circuito Litoral").length).toBeGreaterThanOrEqual(1);
  });

  it("renders my tournaments section", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Meus torneios")).toBeTruthy();
  });
});
