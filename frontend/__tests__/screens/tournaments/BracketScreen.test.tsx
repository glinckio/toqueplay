import React from "react";
import { render } from "@testing-library/react-native";
import { BracketScreen } from "@/screens/tournaments/BracketScreen";

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

const mockNavigation = { goBack: jest.fn() } as any;
const mockRoute = { params: { tournamentId: "t1", tournamentName: "Copa Verão 2026 · Masc Dupla" } };

describe("BracketScreen", () => {
  it("renders screen title and subtitle", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Chaveamento")).toBeTruthy();
    expect(getByText("Copa Verão 2026 · Masc Dupla")).toBeTruthy();
  });

  it("renders phase tabs", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Quartas")).toBeTruthy();
    expect(getByText("Semis")).toBeTruthy();
    expect(getByText("Final")).toBeTruthy();
  });

  it("renders match cards with team names", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Thunder Flex")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText("Sand Blockers")).toBeTruthy();
  });

  it("renders game statuses", () => {
    const { getAllByText, getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getAllByText("CONCLUÍDO").length).toBe(2);
    expect(getByText("AO VIVO · SET 2")).toBeTruthy();
  });

  it("renders legend", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Concluído")).toBeTruthy();
    expect(getByText("Ao vivo")).toBeTruthy();
    expect(getByText("Pendente")).toBeTruthy();
  });

  it("renders court labels", () => {
    const { getByText } = render(<BracketScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Jogo 1 · Quadra A")).toBeTruthy();
    expect(getByText("Jogo 2 · Quadra B")).toBeTruthy();
  });
});
