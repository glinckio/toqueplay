import React from "react";
import { render } from "@testing-library/react-native";
import { MatchResultScreen } from "@/screens/matches/MatchResultScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { matchId: "match-1" } };

describe("MatchResultScreen", () => {
  it("renders match ended header", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("PARTIDA ENCERRADA")).toBeTruthy();
    expect(getByText("Copa Verão 2026 · Semifinal")).toBeTruthy();
  });

  it("renders winner card", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    // O trofeu e o rotulo vivem no mesmo no de texto.
    expect(getByText("🏆 VENCEDOR")).toBeTruthy();
  });

  it("renders final score", () => {
    const { getAllByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getAllByText("Silva & Rocha").length).toBeGreaterThanOrEqual(2);
    expect(getAllByText("Praia Aces").length).toBeGreaterThanOrEqual(1);
  });

  it("renders statistics section", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("ESTATÍSTICAS")).toBeTruthy();
    expect(getByText("Pontos totais")).toBeTruthy();
    expect(getByText("Aces")).toBeTruthy();
    expect(getByText("Erros")).toBeTruthy();
    expect(getByText("Bloqueios")).toBeTruthy();
  });

  it("renders duration, timeouts, cards", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    // A duracao e derivada de startedAt/finishedAt; sem eles a tela mostra "--".
    expect(getByText("Duração")).toBeTruthy();
    expect(getByText("--")).toBeTruthy();
    expect(getByText("Timeouts")).toBeTruthy();
    expect(getByText("Cartões")).toBeTruthy();
  });

  it("renders next match card", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Próximo: Final")).toBeTruthy();
    expect(getByText("Silva & Rocha vs Vôlei Norte · 17:00")).toBeTruthy();
  });

  // "Compartilhar" saiu: as acoes hoje sao seguir para o proximo jogo ou voltar ao chaveamento.
  it("renders action buttons", () => {
    const { getByLabelText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByLabelText("Voltar ao chaveamento")).toBeTruthy();
  });

  it("renders set scores", () => {
    const { getByText } = render(<MatchResultScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("SET 1")).toBeTruthy();
    expect(getByText("SET 2")).toBeTruthy();
  });
});
