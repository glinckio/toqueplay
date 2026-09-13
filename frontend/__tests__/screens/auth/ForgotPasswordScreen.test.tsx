import React from "react";
import { render, fireEvent, within } from "@testing-library/react-native";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("@/services/authService", () => ({
  authService: { forgotPassword: jest.fn() },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe("ForgotPasswordScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders email input and send button", () => {
    const { getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText("E-mail")).toBeTruthy();
    expect(getByText("Enviar código")).toBeTruthy();
  });

  it("shows error when email empty", () => {
    const { getByText, getAllByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText("Enviar código"));
    expect(getAllByText("Informe seu email").length).toBeGreaterThanOrEqual(1);
  });

  it("renders back to login link", () => {
    const { getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText("Voltar para o login")).toBeTruthy();
  });

  it("renders info card about code expiry", () => {
    const { getByText } = render(
      <ForgotPasswordScreen navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText(/código expira em 15 minutos/)).toBeTruthy();
  });
});
