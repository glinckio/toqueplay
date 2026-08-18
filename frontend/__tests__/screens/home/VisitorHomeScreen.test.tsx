import React from "react";
import { render } from "@testing-library/react-native";
import { VisitorHomeScreen } from "@/screens/home/VisitorHomeScreen";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", secondary: "#CFC8E0", tertiary: "#A9A2BC", muted: "#948CA8", disabled: "#6E6684" },
      bg: { base: "#0C0A12", card: "#141019" },
      border: { card: "rgba(255,255,255,0.06)" },
      accent: { active: "#C6F82A" },
    },
    brand: { primary: "#7C3AED", accentLime: "#C6F82A" },
    shadows: { none: {}, sm: {}, md: {}, deeper: {}, lg: {}, purpleGlow: {}, purpleGlowSm: {} },
    semantic: {},
    toggle: jest.fn(),
  }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigation = { navigate: jest.fn() } as any;

describe("VisitorHomeScreen", () => {
  it("renders header with app name and subtitle", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("ToquePlay")).toBeTruthy();
    expect(getByText("Descubra torneios perto de você")).toBeTruthy();
  });

  it("renders ENTRAR button in header", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("ENTRAR")).toBeTruthy();
  });

  it("renders CTA banner with create account button", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Participe de torneios!")).toBeTruthy();
    expect(getByText("CRIAR CONTA GRÁTIS")).toBeTruthy();
  });

  it("renders location banner", () => {
    const { getAllByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getAllByText("Santos, SP").length).toBeGreaterThanOrEqual(1);
  });

  it("renders tournament cards with names", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Copa Verão Beach 2026")).toBeTruthy();
    expect(getByText("Liga Municipal Vôlei")).toBeTruthy();
    expect(getByText("Open de Santos")).toBeTruthy();
  });

  it("renders tournament section title", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Torneios próximos")).toBeTruthy();
  });

  it("renders Ver detalhes buttons on cards", () => {
    const { getAllByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getAllByText("Ver detalhes")).toHaveLength(3);
  });
});
