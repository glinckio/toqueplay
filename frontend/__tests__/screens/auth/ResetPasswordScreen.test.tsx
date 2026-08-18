import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ResetPasswordScreen } from "@/screens/auth/ResetPasswordScreen";

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

jest.mock("@/services/authService", () => ({
  authService: { resetPassword: jest.fn() },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;
const mockRoute = { params: { email: "test@mail.com" } } as any;

describe("ResetPasswordScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders code input and password fields", () => {
    const { getByText, getAllByText } = render(
      <ResetPasswordScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("Código de verificação")).toBeTruthy();
    expect(getAllByText(/Nova senha/i).length).toBeGreaterThanOrEqual(1);
    expect(getByText("Confirmar senha")).toBeTruthy();
    expect(getByText("REDEFINIR SENHA")).toBeTruthy();
  });

  it("shows error for short code", () => {
    const { getByText } = render(
      <ResetPasswordScreen navigation={mockNavigation} route={mockRoute} />,
    );
    fireEvent.press(getByText("REDEFINIR SENHA"));
    expect(getByText("Código deve ter 6 dígitos")).toBeTruthy();
  });

  it("renders back to login link", () => {
    const { getByText } = render(
      <ResetPasswordScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("Voltar para o login")).toBeTruthy();
  });
});
