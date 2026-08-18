import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TeamInviteScreen } from "@/screens/teams/TeamInviteScreen";

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
    expect(getByText("MEMBROS ATUAIS")).toBeTruthy();
    expect(getAllByText("Marcos Silva").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Ana Costa")).toBeTruthy();
    expect(getByText("João Ferreira")).toBeTruthy();
  });

  it("renders accept and reject buttons", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("ACEITAR")).toBeTruthy();
    expect(getByText("RECUSAR")).toBeTruthy();
  });

  it("shows expiry info", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("6 dias")).toBeTruthy();
  });

  it("transitions to success view on accept", () => {
    const { getByText, queryByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByText("ACEITAR"));
    expect(getByText("Você entrou no time!")).toBeTruthy();
    expect(getByText("VER MEU TIME")).toBeTruthy();
    expect(getByText("VOLTAR À HOME")).toBeTruthy();
  });

  it("calls goBack on reject", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByText("RECUSAR"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
