import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
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

function futureDateBR(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

function fillStep1(getByPlaceholderText: any) {
  fireEvent.changeText(getByPlaceholderText("Copa Verão 2026"), "Copa Teste");
}

function fillStep2(getByPlaceholderText: any) {
  fireEvent.changeText(getByPlaceholderText("dd/mm/aa"), futureDateBR(10));
  fireEvent.changeText(getByPlaceholderText("00000-000"), "01001-000");
  fireEvent.changeText(getByPlaceholderText("Nº"), "100");
}

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

  it("blocks Continue on step 1 when name is empty and shows inline error", () => {
    const { getByText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Nome do torneio é obrigatório.")).toBeTruthy();
    expect(getByText("Passo 1")).toBeTruthy();
  });

  it("navigates to step 2 on Continue", () => {
    const { getByText, getByPlaceholderText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 2")).toBeTruthy();
    expect(getByText("LOCALIZAÇÃO")).toBeTruthy();
  });

  it("blocks Continue on step 2 when date/cep/number are missing", () => {
    const { getByText, getByPlaceholderText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Data é obrigatória.")).toBeTruthy();
    expect(getByText("CEP é obrigatório.")).toBeTruthy();
    expect(getByText("Número é obrigatório.")).toBeTruthy();
  });

  it("shows error when tournament date is sooner than 1 week away", () => {
    const { getByText, getByPlaceholderText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fireEvent.changeText(getByPlaceholderText("dd/mm/aa"), futureDateBR(1));
    fireEvent.changeText(getByPlaceholderText("00000-000"), "01001-000");
    fireEvent.changeText(getByPlaceholderText("Nº"), "100");
    fireEvent.press(getByText("Continuar"));
    expect(getByText("A data do torneio precisa ser pelo menos 1 semana no futuro.")).toBeTruthy();
  });

  it("navigates to step 3 on Continue from step 2", () => {
    const { getByText, getByPlaceholderText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fillStep2(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 3")).toBeTruthy();
    expect(getByText("CATEGORIA 1")).toBeTruthy();
  });

  it("navigates to step 4 (Review) with publish button", () => {
    const { getByText, getByPlaceholderText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fillStep2(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 4")).toBeTruthy();
    expect(getByText("Publicar torneio")).toBeTruthy();
    expect(getByText("Salvar como rascunho")).toBeTruthy();
  });

  it("shows success screen on publish", async () => {
    const { getByText, getByPlaceholderText } = render(<CreateTournamentScreen navigation={mockNavigation} />);
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fillStep2(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Publicar torneio"));
    await waitFor(() => {
      expect(getByText("Tudo pronto")).toBeTruthy();
    });
    expect(getByText("Torneio\npublicado!")).toBeTruthy();
    expect(getByText("Ver torneio")).toBeTruthy();
    expect(getByText("Compartilhar")).toBeTruthy();
  });
});
