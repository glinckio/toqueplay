import React from "react";
import { render } from "@testing-library/react-native";
import { MatchResultScreen } from "@/screens/matches/MatchResultScreen";

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

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { matchId: "match-1" } };

describe("MatchResultScreen", () => {
  it("renders match ended header", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("PARTIDA ENCERRADA")).toBeTruthy();
    expect(getByText("Copa Verão 2026 · Semifinal")).toBeTruthy();
  });

  it("renders winner card", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("VENCEDOR")).toBeTruthy();
    expect(getByText("🏆")).toBeTruthy();
  });

  it("renders final score", () => {
    const { getAllByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getAllByText("Silva & Rocha").length).toBeGreaterThanOrEqual(2);
    expect(getAllByText("Praia Aces").length).toBeGreaterThanOrEqual(1);
  });

  it("renders statistics section", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("ESTATÍSTICAS")).toBeTruthy();
    expect(getByText("Pontos totais")).toBeTruthy();
    expect(getByText("Aces")).toBeTruthy();
    expect(getByText("Erros")).toBeTruthy();
    expect(getByText("Bloqueios")).toBeTruthy();
  });

  it("renders duration, timeouts, cards", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("48min")).toBeTruthy();
    expect(getByText("Duração")).toBeTruthy();
    expect(getByText("Timeouts")).toBeTruthy();
    expect(getByText("Cartões")).toBeTruthy();
  });

  it("renders next match card", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Próximo: Final")).toBeTruthy();
    expect(getByText("Silva & Rocha vs Vôlei Norte · 17:00")).toBeTruthy();
  });

  it("renders action buttons", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Compartilhar")).toBeTruthy();
    expect(getByText("Ver bracket")).toBeTruthy();
  });

  it("renders set scores", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("SET 1")).toBeTruthy();
    expect(getByText("SET 2")).toBeTruthy();
  });
});
