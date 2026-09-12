import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("@/services/authService", () => ({
  authService: { register: jest.fn() },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

describe("RegisterScreen", () => {
  it("renders all form fields", () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={{} as any} />,
    );
    expect(getByText("Nome completo")).toBeTruthy();
    expect(getByText("E-mail")).toBeTruthy();
    expect(getByText("CPF")).toBeTruthy();
    expect(getByText("Senha")).toBeTruthy();
  });

  it("shows validation errors on empty submit", () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText("CRIAR CONTA"));
    expect(getByText("Mínimo 2 caracteres")).toBeTruthy();
  });

  it("navigates to Login on link press", () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} route={{} as any} />,
    );
    fireEvent.press(getByText("Entrar"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Login");
  });
});
