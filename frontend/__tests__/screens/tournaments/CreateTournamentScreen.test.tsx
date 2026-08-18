import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CreateTournamentScreen } from "@/screens/tournaments/CreateTournamentScreen";

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

describe("CreateTournamentScreen", () => {
  it("renders step 1 with title and progress", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    expect(getByText("Criar torneio")).toBeTruthy();
    expect(getByText("Passo 1 de 4")).toBeTruthy();
  });

  it("renders step labels", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    expect(getByText("Básico")).toBeTruthy();
    expect(getByText("Estrutura")).toBeTruthy();
    expect(getByText("Categorias")).toBeTruthy();
    expect(getByText("Revisão")).toBeTruthy();
  });

  it("renders step 1 fields", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    expect(getByText("Banner do torneio")).toBeTruthy();
    expect(getByText("Evento único")).toBeTruthy();
    expect(getByText("Circuito")).toBeTruthy();
  });

  it("navigates to step 2 on Continue", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 2 de 4")).toBeTruthy();
    expect(getByText("LOCALIZAÇÃO")).toBeTruthy();
  });

  it("navigates to step 3 on Continue from step 2", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 3 de 4")).toBeTruthy();
    expect(getByText("CATEGORIA 1")).toBeTruthy();
  });

  it("navigates to step 4 (Review) with publish button", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 4 de 4")).toBeTruthy();
    expect(getByText("PUBLICAR TORNEIO")).toBeTruthy();
    expect(getByText("Salvar como rascunho")).toBeTruthy();
  });

  it("shows success screen on publish", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("PUBLICAR TORNEIO"));
    expect(getByText("TUDO PRONTO")).toBeTruthy();
    expect(getByText("Torneio\npublicado!")).toBeTruthy();
    expect(getByText("VER TORNEIO")).toBeTruthy();
    expect(getByText("Compartilhar")).toBeTruthy();
  });
});
