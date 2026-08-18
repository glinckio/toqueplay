import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MyTournamentsScreen } from "@/screens/tournaments/MyTournamentsScreen";

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

const mockNavigation = { goBack: jest.fn() } as any;

describe("MyTournamentsScreen", () => {
  it("renders screen title", () => {
    const { getByText } = render(<MyTournamentsScreen navigation={mockNavigation} />);
    expect(getByText("Meus torneios")).toBeTruthy();
  });

  it("renders filter tabs", () => {
    const { getByText } = render(<MyTournamentsScreen navigation={mockNavigation} />);
    expect(getByText("Todos")).toBeTruthy();
    expect(getByText("Rascunho")).toBeTruthy();
    expect(getByText("Ativo")).toBeTruthy();
    expect(getByText("Encerrado")).toBeTruthy();
  });

  it("renders tournament cards", () => {
    const { getByText } = render(<MyTournamentsScreen navigation={mockNavigation} />);
    expect(getByText("Copa Verão Beach 2026")).toBeTruthy();
    expect(getByText("Circuito Indoor SP")).toBeTruthy();
    expect(getByText("Liga Municipal Vôlei")).toBeTruthy();
  });

  it("renders status badges", () => {
    const { getByText } = render(<MyTournamentsScreen navigation={mockNavigation} />);
    expect(getByText("INSCRIÇÕES ABERTAS")).toBeTruthy();
    expect(getByText("RASCUNHO")).toBeTruthy();
    expect(getByText("EM ANDAMENTO")).toBeTruthy();
  });

  it("renders action labels", () => {
    const { getByText } = render(<MyTournamentsScreen navigation={mockNavigation} />);
    expect(getByText("Gerenciar →")).toBeTruthy();
    expect(getByText("Editar →")).toBeTruthy();
    expect(getByText("Ver partidas →")).toBeTruthy();
  });
});
