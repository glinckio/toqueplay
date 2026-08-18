import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { VerifyEmailScreen } from "@/screens/auth/VerifyEmailScreen";

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
  authService: {
    verifyEmail: jest.fn(),
    resendCode: jest.fn(),
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({ setAuth: jest.fn() }),
}));

const mockNavigation = { goBack: jest.fn() } as any;
const mockRoute = { params: { email: "test@mail.com" } } as any;

describe("VerifyEmailScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders OTP input and verify button", () => {
    const { getByText } = render(
      <VerifyEmailScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("VERIFICAR")).toBeTruthy();
    expect(getByText(/test@mail.com/)).toBeTruthy();
  });

  it("shows resend cooldown text", () => {
    const { getByText } = render(
      <VerifyEmailScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText(/Reenviar em/)).toBeTruthy();
  });

  it("renders title and email display", () => {
    const { getByText } = render(
      <VerifyEmailScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("Verifique seu e-mail")).toBeTruthy();
    expect(getByText("Voltar")).toBeTruthy();
  });

  it("renders open email app link", () => {
    const { getByText } = render(
      <VerifyEmailScreen navigation={mockNavigation} route={mockRoute} />,
    );
    expect(getByText("Abrir app de e-mail")).toBeTruthy();
  });
});
