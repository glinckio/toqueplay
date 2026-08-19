import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ManageTeamsScreen } from "@/screens/teams/ManageTeamsScreen";
import { teamsService } from "@/services/teamsService";

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

describe("ManageTeamsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders team list with names", () => {
    const { getByText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    expect(getByText("Meus times")).toBeTruthy();
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Vôlei Norte")).toBeTruthy();
  });

  it("renders team stats", () => {
    const { getAllByText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    expect(getAllByText("Torneios").length).toBeGreaterThanOrEqual(2);
    expect(getAllByText("Vitórias").length).toBeGreaterThanOrEqual(2);
  });

  it("renders pending invites section", () => {
    const { getByText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    expect(getByText("CONVITES PENDENTES")).toBeTruthy();
    expect(getByText("Beach Titans")).toBeTruthy();
  });

  it("navigates to team detail on press", () => {
    const { getByText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Silva & Rocha"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("TeamDetail", { id: "team-1" });
  });

  it("navigates to create team on FAB press", () => {
    const { getByLabelText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Criar time"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("CreateTeam");
  });

  it("handles accept invite", () => {
    const { getByLabelText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Aceitar convite Beach Titans"));
    expect(teamsService.acceptInvitation).toHaveBeenCalledWith("inv-1");
  });

  it("handles reject invite", () => {
    const { getByLabelText } = render(<ManageTeamsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Recusar convite Beach Titans"));
    expect(teamsService.rejectInvitation).toHaveBeenCalledWith("inv-1");
  });
});
