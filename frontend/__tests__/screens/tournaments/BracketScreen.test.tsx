import React from "react";
import { render } from "@testing-library/react-native";
import { BracketScreen } from "@/screens/tournaments/BracketScreen";

const mockBracketData = [
  {
    id: "b1",
    matches: [
      {
        id: "m1",
        round: 1,
        position: 0,
        status: "FINISHED",
        label: null,
        teamAId: "ta1",
        teamBId: "tb1",
        teamA: { id: "ta1", name: "Silva & Rocha", avatarUrl: null },
        teamB: { id: "tb1", name: "Thunder Flex", avatarUrl: null },
        scoreTeamA: 21,
        scoreTeamB: 15,
        winnerId: "ta1",
        sets: [],
      },
      {
        id: "m2",
        round: 1,
        position: 1,
        status: "IN_PROGRESS",
        label: null,
        teamAId: "ta2",
        teamBId: "tb2",
        teamA: { id: "ta2", name: "Praia Aces", avatarUrl: null },
        teamB: { id: "tb2", name: "Sand Blockers", avatarUrl: null },
        scoreTeamA: null,
        scoreTeamB: null,
        winnerId: null,
        sets: [],
      },
      {
        id: "m3",
        round: 2,
        position: 0,
        status: "PENDING",
        label: "FINAL",
        teamAId: null,
        teamBId: null,
        teamA: null,
        teamB: null,
        scoreTeamA: null,
        scoreTeamB: null,
        winnerId: null,
        sets: [],
      },
    ],
  },
];

let mockData: any = mockBracketData;

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", secondary: "#CFC8E0", tertiary: "#A9A2BC", muted: "#948CA8", disabled: "#6E6684" },
    },
    brand: { primary: "#7C3AED", accentLime: "#C6F82A" },
    shadows: { none: {}, sm: {}, md: {}, deeper: {}, lg: {}, purpleGlow: {}, purpleGlowSm: {} },
    semantic: {},
    toggle: jest.fn(),
  }),
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    data: mockData,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const mockRoute = { params: { tournamentId: "t1" } };

describe("BracketScreen", () => {
  beforeEach(() => {
    mockData = mockBracketData;
  });

  it("renders screen title", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Chaveamento")).toBeTruthy();
  });

  it("renders Todos tab", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Todos")).toBeTruthy();
  });

  it("renders team names from bracket data", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Thunder Flex")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText("Sand Blockers")).toBeTruthy();
  });

  it("renders match statuses", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("CONCLUÍDO")).toBeTruthy();
    expect(getByText("AO VIVO")).toBeTruthy();
    expect(getByText("PENDENTE")).toBeTruthy();
  });

  it("renders legend", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Concluído")).toBeTruthy();
    expect(getByText("Ao vivo")).toBeTruthy();
    expect(getByText("Pendente")).toBeTruthy();
  });

  it("renders A definir for matches without teams", () => {
    const { getAllByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getAllByText("A definir").length).toBe(2);
  });

  it("renders empty state when no bracket data", () => {
    mockData = [];
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Nenhum chaveamento gerado ainda.")).toBeTruthy();
  });
});
