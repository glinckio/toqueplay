import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { authService } from "@/services/authService";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", secondary: "#CFC8E0", tertiary: "#A9A2BC", muted: "#948CA8", disabled: "#6E6684" },
      bg: { base: "#0C0A12", card: "#141019" },
      border: { card: "rgba(255,255,255,0.06)" },
      accent: { active: "#C6F82A" },
    },
    brand: { primary: "#7C3AED", accentLime: "#C6F82A" },
    shadows: { none: {}, sm: {}, md: {}, deeper: {}, lg: {}, purpleGlow: {}, purpleGlowSm: {} },
    semantic: {},
    toggle: jest.fn(),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("@/services/authService", () => ({
  authService: {
    login: jest.fn(),
    isTwoFactorRequired: jest.fn(() => false),
  },
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({
      setAuth: jest.fn(),
      setVisitorActive: jest.fn(),
    }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email and password inputs", () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText("E-mail")).toBeTruthy();
    expect(getByText("Senha")).toBeTruthy();
  });

  it("shows error when fields empty", () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText("ENTRAR"));
    expect(getByText("Preencha email e senha")).toBeTruthy();
  });

  it("navigates to Register", () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText("Cadastre-se"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Register");
  });

  it("navigates to ForgotPassword", () => {
    const { getByText } = render(
      <LoginScreen navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText("Esqueci a senha"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ForgotPassword");
  });
});
