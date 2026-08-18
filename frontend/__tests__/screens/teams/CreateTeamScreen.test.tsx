import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CreateTeamScreen } from "@/screens/teams/CreateTeamScreen";

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

describe("CreateTeamScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders create team form", () => {
    const { getAllByText, getByText, getByLabelText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getAllByText("Criar time").length).toBeGreaterThanOrEqual(1);
    expect(getByText("NOME DO TIME")).toBeTruthy();
    expect(getByText("MODALIDADE")).toBeTruthy();
    expect(getByText("SUPERFÍCIE")).toBeTruthy();
  });

  it("renders format options", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("Dupla")).toBeTruthy();
    expect(getByText("Quarteto")).toBeTruthy();
  });

  it("renders surface options", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("Areia")).toBeTruthy();
    expect(getByText("Quadra")).toBeTruthy();
  });

  it("renders invite section", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("CONVIDAR PARCEIRO")).toBeTruthy();
    expect(getByText("Ou compartilhar link de convite")).toBeTruthy();
  });

  it("renders avatar placeholder", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("Adicionar logo")).toBeTruthy();
  });

  it("allows typing team name", () => {
    const { getByLabelText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    const input = getByLabelText("Nome do time");
    fireEvent.changeText(input, "Beach Warriors");
    expect(input.props.value).toBe("Beach Warriors");
  });
});
