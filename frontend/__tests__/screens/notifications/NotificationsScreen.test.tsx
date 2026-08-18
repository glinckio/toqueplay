import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";

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

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("NotificationsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title and unread count", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Notificações")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
  });

  it("renders date groups", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("HOJE")).toBeTruthy();
    expect(getByText("ONTEM")).toBeTruthy();
    expect(getByText("15 AGO")).toBeTruthy();
  });

  it("renders notification items", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Inscrição confirmada")).toBeTruthy();
    expect(getByText("Novo convite de time")).toBeTruthy();
    expect(getByText("Amistoso aceito")).toBeTruthy();
  });

  it("marks notification as read on press", () => {
    const { getByLabelText, rerender } = render(<NotificationsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Inscrição confirmada"));
  });

  it("marks all as read", () => {
    const { getByLabelText } = render(<NotificationsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Marcar todas como lidas"));
  });

  it("navigates back", () => {
    const { getByLabelText } = render(<NotificationsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("shows notification body text", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Sua inscrição na Copa Verão 2026 foi confirmada.")).toBeTruthy();
    expect(getByText("Beach Titans convidou você para a dupla.")).toBeTruthy();
  });
});
