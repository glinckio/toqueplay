import React from "react";
import { render } from "@testing-library/react-native";
import { HomeScreen } from "@/screens/home/HomeScreen";

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

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    getParent: () => ({ navigate: jest.fn() }),
  }),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { name: "Lucas Mendes", email: "lucas@test.com" },
      isAuthenticated: true,
      _hasHydrated: true,
    }),
}));

describe("HomeScreen", () => {
  it("renders greeting with user first name", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Olá, Lucas")).toBeTruthy();
    expect(getByText("Pronto pra jogar?")).toBeTruthy();
  });

  it("renders live match section with tournament name", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Copa Verão")).toBeTruthy();
    expect(getByText("ASSISTIR AGORA")).toBeTruthy();
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
    expect(getByText("Circuito Litoral")).toBeTruthy();
  });

  it("renders my tournaments section", () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText("Meus torneios")).toBeTruthy();
    expect(getByText("Circuito Litoral · Et. 2")).toBeTruthy();
  });
});
