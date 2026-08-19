import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MyFriendliesScreen } from "@/screens/friendlies/MyFriendliesScreen";

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

describe("MyFriendliesScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title and tabs", () => {
    const { getByText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    expect(getByText("Amistosos")).toBeTruthy();
    expect(getByText("Enviados")).toBeTruthy();
    expect(getByText("Recebidos")).toBeTruthy();
  });

  it("shows sent friendlies by default", () => {
    const { getByText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    expect(getByText("vs Beach Titans")).toBeTruthy();
    expect(getByText("vs Vôlei Sul")).toBeTruthy();
  });

  it("switches to received tab", () => {
    const { getByText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Recebidos"));
    expect(getByText("vs Sand Storm")).toBeTruthy();
    expect(getByText("vs Ace Team")).toBeTruthy();
  });

  it("shows status pills", () => {
    const { getByText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    expect(getByText("PENDENTE")).toBeTruthy();
    expect(getByText("ACEITO")).toBeTruthy();
  });

  it("navigates to detail on card press", () => {
    const { getByLabelText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Amistoso contra Beach Titans"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("FriendlyDetail", { id: "f1" });
  });

  it("navigates to create on FAB press", () => {
    const { getByLabelText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Criar amistoso"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("CreateFriendly");
  });

  it("shows date, time, and location info", () => {
    const { getByText } = render(<MyFriendliesScreen navigation={mockNavigation} />);
    expect(getByText(/22.*ago/i)).toBeTruthy();
    expect(getByText("16:00")).toBeTruthy();
  });
});
