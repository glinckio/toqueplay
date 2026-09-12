import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { CreateTournamentScreen } from "@/screens/tournaments/CreateTournamentScreen";

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

function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

/**
 * Abre o seletor do campo e escolhe a data na grade, no lugar de digitar.
 * O seletor e do proprio app, entao o teste navega nele como o usuario faria.
 */
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pickDate(utils: any, label: string, date: Date) {
  fireEvent.press(utils.getByLabelText(label));
  // A grade abre no mes do valor atual; anda ate o mes alvo se precisar.
  const hoje = new Date();
  const meses = (date.getFullYear() - hoje.getFullYear()) * 12 + (date.getMonth() - hoje.getMonth());
  for (let i = 0; i < Math.abs(meses); i++) {
    fireEvent.press(utils.getByLabelText(meses > 0 ? "Próximo mês" : "Mês anterior"));
  }
  fireEvent.press(utils.getByLabelText(`${date.getDate()} de ${MESES[date.getMonth()]}`));
  fireEvent.press(utils.getByText("Confirmar"));
}

function fillStep1(getByPlaceholderText: any) {
  fireEvent.changeText(getByPlaceholderText("Copa Verão 2026"), "Copa Teste");
}

function fillStep2(getByPlaceholderText: any, utils?: any) {
  if (utils) pickDate(utils, "Data do torneio", futureDate(10));
  fireEvent.changeText(getByPlaceholderText("00000-000"), "01001-000");
  fireEvent.changeText(getByPlaceholderText("Nº"), "100");
}

describe("CreateTournamentScreen", () => {
  it("renders step 1 with title and progress", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText } = utils;
    expect(getByText("Criar torneio")).toBeTruthy();
    expect(getByText("Passo 1 de 4")).toBeTruthy();
  });

  it("renders step labels", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText } = utils;
    expect(getByText("Básico")).toBeTruthy();
    expect(getByText("Estrutura")).toBeTruthy();
    expect(getByText("Categorias")).toBeTruthy();
    expect(getByText("Revisão")).toBeTruthy();
  });

  it("renders step 1 fields", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText } = utils;
    expect(getByText("Banner do torneio")).toBeTruthy();
    // Tres formatos: unico, liga e circuito. Os rotulos sao curtos para caber lado a lado.
    expect(getByText("Único")).toBeTruthy();
    expect(getByText("Liga")).toBeTruthy();
    expect(getByText("Circuito")).toBeTruthy();
  });

  it("blocks Continue on step 1 when name is empty and shows inline error", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText } = utils;
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Nome do torneio é obrigatório.")).toBeTruthy();
    expect(getByText("Passo 1")).toBeTruthy();
  });

  it("navigates to step 2 on Continue", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText, getByPlaceholderText } = utils;
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 2")).toBeTruthy();
    expect(getByText("LOCALIZAÇÃO")).toBeTruthy();
  });

  it("blocks Continue on step 2 when date/cep/number are missing", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText, getByPlaceholderText } = utils;
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Data é obrigatória.")).toBeTruthy();
    expect(getByText("CEP é obrigatório.")).toBeTruthy();
    expect(getByText("Número é obrigatório.")).toBeTruthy();
  });

  it("shows error when tournament date is sooner than 1 week away", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText, getByPlaceholderText } = utils;
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    pickDate(utils, "Data do torneio", futureDate(1));
    fireEvent.changeText(getByPlaceholderText("00000-000"), "01001-000");
    fireEvent.changeText(getByPlaceholderText("Nº"), "100");
    fireEvent.press(getByText("Continuar"));
    expect(getByText("A data do torneio precisa ser pelo menos 1 semana no futuro.")).toBeTruthy();
  });

  it("navigates to step 3 on Continue from step 2", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText, getByPlaceholderText } = utils;
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fillStep2(getByPlaceholderText, utils);
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 3")).toBeTruthy();
    expect(getByText("CATEGORIA 1")).toBeTruthy();
  });

  it("navigates to step 4 (Review) with publish button", () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText, getByPlaceholderText } = utils;
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fillStep2(getByPlaceholderText, utils);
    fireEvent.press(getByText("Continuar"));
    fireEvent.press(getByText("Continuar"));
    expect(getByText("Passo 4")).toBeTruthy();
    expect(getByText("Publicar torneio")).toBeTruthy();
    expect(getByText("Salvar como rascunho")).toBeTruthy();
  });

  it("shows success screen on publish", async () => {
    const utils = render(<CreateTournamentScreen navigation={mockNavigation} />);
    const { getByText, getByPlaceholderText } = utils;
    fillStep1(getByPlaceholderText);
    fireEvent.press(getByText("Continuar"));
    fillStep2(getByPlaceholderText, utils);
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
