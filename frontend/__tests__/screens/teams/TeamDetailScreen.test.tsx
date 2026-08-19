import React from "react";
import { render } from "@testing-library/react-native";
import { TeamDetailScreen } from "@/screens/teams/TeamDetailScreen";

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
const mockRoute = { params: { id: "team-1" } };

describe("TeamDetailScreen", () => {
  it("renders team name and format", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Dupla · Areia")).toBeTruthy();
  });

  it("renders stats section", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("3")).toBeTruthy();
    expect(getByText("67%")).toBeTruthy();
    expect(getByText("Torneios")).toBeTruthy();
  });

  it("renders members list with roles", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Lucas Costa")).toBeTruthy();
    expect(getByText("Rafael Silva")).toBeTruthy();
    expect(getByText("CAPITÃO")).toBeTruthy();
    expect(getByText("MEMBRO")).toBeTruthy();
  });

  it("renders history section", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("HISTÓRICO")).toBeTruthy();
    expect(getByText("Sem histórico")).toBeTruthy();
  });

  it("renders edit button", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Editar")).toBeTruthy();
  });

  it("renders invite link", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("+ Convidar")).toBeTruthy();
  });
});
