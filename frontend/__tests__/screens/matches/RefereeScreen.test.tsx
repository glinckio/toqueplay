import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { RefereeScreen } from "@/screens/matches/RefereeScreen";
import { matchesService } from "@/services/matchesService";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("expo-screen-orientation", () => ({
  // Resolvido, nao undefined: a tela encadeia `.catch()` no lockAsync.
  lockAsync: jest.fn().mockResolvedValue(undefined),
  OrientationLock: { LANDSCAPE: "LANDSCAPE", PORTRAIT_UP: "PORTRAIT_UP" },
}));

jest.mock("@/services/socket", () => ({
  getSocket: () => ({ on: jest.fn(), off: jest.fn(), emit: jest.fn(), connected: true }),
}));

jest.mock("@/services/matchesService", () => ({
  matchesService: {
    claimMatch: jest.fn(),
    startMatch: jest.fn(),
    registerPoint: jest.fn(),
    finishSet: jest.fn(),
    finishMatch: jest.fn(),
  },
}));

/**
 * Esta tela foi refatorada: a entrada do código de árbitro saiu daqui e vive hoje no diálogo do
 * chaveamento e do amistoso. O que sobrou é o fluxo depois que a partida já foi reivindicada —
 * `loading` → `pregame` (não começou) ou `live` (retomando uma em andamento).
 */
const partidaBase = {
  id: "m1",
  status: "SCHEDULED",
  tournamentName: "Copa Verão",
  bestOfSets: 3,
  teamA: { id: "a", name: "Beach Titans" },
  teamB: { id: "b", name: "Sand Storm" },
  sets: [],
  scoreTeamA: 0,
  scoreTeamB: 0,
};

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const rota = { params: { matchId: "m1" } };

const renderTela = () =>
  render(<RefereeScreen navigation={mockNavigation} route={rota} />);

describe("RefereeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (matchesService.claimMatch as jest.Mock).mockResolvedValue(partidaBase);
  });

  it("reivindica a partida recebida pela rota", async () => {
    renderTela();
    await waitFor(() => {
      expect(matchesService.claimMatch).toHaveBeenCalledWith("m1");
    });
  });

  it("abre no pré-jogo quando a partida ainda não começou", async () => {
    const { getByText, getAllByText } = renderTela();
    await waitFor(() => {
      expect(getByText("Pré-jogo")).toBeTruthy();
    });
    // O nome do torneio aparece em mais de um lugar da tela.
    expect(getAllByText("Copa Verão").length).toBeGreaterThanOrEqual(1);
  });

  it("oferece iniciar a partida no pré-jogo", async () => {
    const { getByText } = renderTela();
    await waitFor(() => {
      expect(getByText("Iniciar partida")).toBeTruthy();
    });
  });

  // Árbitro que perde conexão e volta não pode recomeçar do zero: o placar vem do servidor.
  it("retoma o placar quando a partida já está em andamento", async () => {
    (matchesService.claimMatch as jest.Mock).mockResolvedValue({
      ...partidaBase,
      status: "IN_PROGRESS",
      scoreTeamA: 1,
      scoreTeamB: 0,
      sets: [
        { setNumber: 1, scoreA: 21, scoreB: 18 },
        { setNumber: 2, scoreA: 12, scoreB: 9 },
      ],
    });

    const { queryByText, getAllByText } = renderTela();

    await waitFor(() => {
      // Já em jogo: não passa pelo pré-jogo.
      expect(queryByText("Pré-jogo")).toBeNull();
    });
    // Placar do set corrente restaurado do servidor.
    expect(getAllByText("12").length).toBeGreaterThanOrEqual(1);
  });

  it("mostra o erro quando não consegue assumir a partida", async () => {
    (matchesService.claimMatch as jest.Mock).mockRejectedValue({
      response: { data: { code: "REFEREE_ALREADY_IN_MATCH" } },
    });

    const { getByText } = renderTela();

    await waitFor(() => {
      expect(getByText(/Finalize sua partida atual/)).toBeTruthy();
    });
  });
});
