import React from "react";
import { render } from "@testing-library/react-native";
import { TwoFactorScreen } from "@/screens/auth/TwoFactorScreen";

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

jest.mock("@/services/authService", () => ({
  authService: { verify2fa: jest.fn() },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({ setAuth: jest.fn() }),
}));

const mockNavigation = { goBack: jest.fn() } as any;
const mockRoute = { params: { temporaryToken: "tok123" } } as any;

describe("TwoFactorScreen", () => {
  it("renders OTP input and verify button", () => {
    const { getByText } = render(
      <TwoFactorScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("VERIFICAR")).toBeTruthy();
    expect(getByText(/aplicativo autenticador/)).toBeTruthy();
  });

  it("renders title and back button", () => {
    const { getByText } = render(
      <TwoFactorScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("Autenticação 2FA")).toBeTruthy();
    expect(getByText("Voltar")).toBeTruthy();
  });

  it("renders info card", () => {
    const { getByText } = render(
      <TwoFactorScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText(/Google Authenticator/)).toBeTruthy();
  });
});
