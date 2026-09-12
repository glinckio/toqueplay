import React from "react";
import { render } from "@testing-library/react-native";
import { TwoFactorScreen } from "@/screens/auth/TwoFactorScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
    expect(getByText("Verificar")).toBeTruthy();
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
