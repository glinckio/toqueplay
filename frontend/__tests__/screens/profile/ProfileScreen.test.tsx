import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";

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

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("ProfileScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders profile info", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Perfil")).toBeTruthy();
    expect(getByText("Lucas Costa")).toBeTruthy();
    expect(getByText("@lucascosta")).toBeTruthy();
  });

  it("renders stats bar", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Torneios")).toBeTruthy();
    expect(getByText("Vitórias")).toBeTruthy();
    expect(getByText("Win rate")).toBeTruthy();
    expect(getByText("Times")).toBeTruthy();
  });

  it("renders contact info cards", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("lucas@email.com")).toBeTruthy();
    expect(getByText("(21) 99999-0000")).toBeTruthy();
    expect(getByText("Rio de Janeiro, RJ")).toBeTruthy();
  });

  it("renders menu items", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Meus times")).toBeTruthy();
    expect(getByText("Meus torneios")).toBeTruthy();
    expect(getByText("Amistosos")).toBeTruthy();
    expect(getByText("Notificações")).toBeTruthy();
    expect(getByText("Privacidade & LGPD")).toBeTruthy();
  });

  it("navigates to menu screens on press", () => {
    const { getByLabelText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Meus times"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ManageTeams");
    fireEvent.press(getByLabelText("Notificações"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Notifications");
  });

  it("toggles edit mode", () => {
    const { getByLabelText, getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Editar perfil"));
    expect(getByLabelText("Nome")).toBeTruthy();
    expect(getByLabelText("Bio")).toBeTruthy();
    expect(getByLabelText("Telefone")).toBeTruthy();
  });

  it("saves and exits edit mode", async () => {
    const { getByLabelText, queryByLabelText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Editar perfil"));
    fireEvent.press(getByLabelText("Salvar perfil"));
    await waitFor(() => expect(queryByLabelText("Nome")).toBeNull());
  });
});
