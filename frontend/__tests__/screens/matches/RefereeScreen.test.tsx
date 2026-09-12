import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { RefereeScreen } from "@/screens/matches/RefereeScreen";

const mockEnterRefereeCode = jest.fn();
const mockGetBracket = jest.fn();
const mockClaimMatch = jest.fn();
const mockStartMatch = jest.fn();
const mockRegisterPoint = jest.fn();
const mockRemovePoint = jest.fn();
const mockFinishSet = jest.fn();
const mockFinishMatch = jest.fn();

jest.mock("@/services/tournamentsService", () => ({
  tournamentsService: {
    enterRefereeCode: (...args: any[]) => mockEnterRefereeCode(...args),
    getBracket: (...args: any[]) => mockGetBracket(...args),
  },
}));

jest.mock("@/services/matchesService", () => ({
  matchesService: {
    claimMatch: (...args: any[]) => mockClaimMatch(...args),
    startMatch: (...args: any[]) => mockStartMatch(...args),
    registerPoint: (...args: any[]) => mockRegisterPoint(...args),
    removePoint: (...args: any[]) => mockRemovePoint(...args),
    finishSet: (...args: any[]) => mockFinishSet(...args),
    finishMatch: (...args: any[]) => mockFinishMatch(...args),
  },
}));

jest.mock("@/services/api", () => ({
  getErrorMessage: (_err: any, fallback: string) => fallback,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

const MOCK_BRACKET = [
  {
    id: "bracket-1",
    matches: [
      {
        id: "match-1",
        round: 1,
        position: 0,
        status: "SCHEDULED",
        teamA: { id: "t1", name: "Silva & Rocha", avatarUrl: null },
        teamB: { id: "t2", name: "Praia Aces", avatarUrl: null },
        teamAId: "t1",
        teamBId: "t2",
        refereeId: null,
        label: "SEMIFINAL",
      },
      {
        id: "match-2",
        round: 1,
        position: 1,
        status: "SCHEDULED",
        teamA: { id: "t3", name: "Duo Fire", avatarUrl: null },
        teamB: { id: "t4", name: "Beach Kings", avatarUrl: null },
        teamAId: "t3",
        teamBId: "t4",
        refereeId: "other-referee-id",
        label: "SEMIFINAL",
      },
    ],
  },
];

const MOCK_MATCH = {
  id: "match-1",
  status: "SCHEDULED",
  tournamentName: "Copa Verão 2026",
  round: "Semifinal",
  teamA: { id: "t1", name: "Silva & Rocha", avatarUrl: null, initials: "SR" },
  teamB: { id: "t2", name: "Praia Aces", avatarUrl: null, initials: "PA" },
  scoreTeamA: 0,
  scoreTeamB: 0,
  currentSet: 1,
  sets: [],
  winnerId: null,
  refereeId: null,
  refereeCode: null,
  servingTeam: null,
  format: "Melhor de 3",
  category: "Masc · Dupla",
  scheduledAt: "2026-07-12T14:30:00.000Z",
  startedAt: null,
  finishedAt: null,
  duration: null,
  timeouts: { A: 0, B: 0 },
  cards: { A: 0, B: 0 },
};

function setupMocks() {
  mockEnterRefereeCode.mockResolvedValue({ tournamentId: "t-1", tournamentName: "Copa Verão 2026" });
  mockGetBracket.mockResolvedValue(MOCK_BRACKET);
  mockClaimMatch.mockResolvedValue(MOCK_MATCH);
  mockStartMatch.mockResolvedValue(MOCK_MATCH);
  mockRegisterPoint.mockResolvedValue(MOCK_MATCH);
  mockRemovePoint.mockResolvedValue(MOCK_MATCH);
  mockFinishSet.mockResolvedValue(MOCK_MATCH);
  mockFinishMatch.mockResolvedValue(MOCK_MATCH);
}

async function enterCodeAndGoToBracket(getAllByLabelText: any, getByText: any) {
  for (let i = 1; i <= 6; i++) {
    fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
  }
  fireEvent.press(getByText("Entrar na partida"));
  await waitFor(() => {
    expect(getByText("Selecionar partida")).toBeTruthy();
  });
}

describe("RefereeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it("renders code entry step", () => {
    const { getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    expect(getByText("Entrar como árbitro")).toBeTruthy();
    expect(getByText("Código da partida")).toBeTruthy();
    expect(getByText("Entrar na partida")).toBeTruthy();
  });

  it("renders 6 digit inputs", () => {
    const { getAllByLabelText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    const digits = [1, 2, 3, 4, 5, 6].map((n) => getAllByLabelText(`Dígito ${n}`));
    expect(digits).toHaveLength(6);
  });

  it("transitions to bracket step on valid code entry", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    expect(getByText("Copa Verão 2026")).toBeTruthy();
    expect(getByText("ÁRBITRO")).toBeTruthy();
  });

  it("shows available matches in bracket step", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText("Apitar esta partida")).toBeTruthy();
  });

  it("shows locked indicator for claimed matches", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    expect(getByText("Outro árbitro selecionou")).toBeTruthy();
  });

  it("transitions to pregame after claiming match", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    fireEvent.press(getByText("Apitar esta partida"));
    await waitFor(() => {
      expect(getByText("Pré-jogo")).toBeTruthy();
    });
    expect(getByText("CONFRONTO")).toBeTruthy();
    expect(getByText("CONECTADO")).toBeTruthy();
  });

  it("transitions to live scoring on start", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    fireEvent.press(getByText("Apitar esta partida"));
    await waitFor(() => expect(getByText("Pré-jogo")).toBeTruthy());
    fireEvent.press(getByText("Iniciar partida"));
    await waitFor(() => expect(getByText("AO VIVO")).toBeTruthy());
    expect(getByText("PONTO SR")).toBeTruthy();
    expect(getByText("PONTO PA")).toBeTruthy();
  });

  it("renders live scoring action bar", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    fireEvent.press(getByText("Apitar esta partida"));
    await waitFor(() => expect(getByText("Pré-jogo")).toBeTruthy());
    fireEvent.press(getByText("Iniciar partida"));
    await waitFor(() => expect(getByText("AO VIVO")).toBeTruthy());
    expect(getByText("Timeout")).toBeTruthy();
    expect(getByText("Cartão")).toBeTruthy();
    expect(getByText("Trocar saque")).toBeTruthy();
    expect(getByText("Histórico")).toBeTruthy();
    expect(getByText("Desfazer último ponto")).toBeTruthy();
  });

  it("renders info hint in code step", () => {
    const { getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    expect(getByText("Peça o código ao organizador da partida")).toBeTruthy();
  });

  it("renders live broadcast warning in pregame", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    fireEvent.press(getByText("Apitar esta partida"));
    await waitFor(() => expect(getByText("Pré-jogo")).toBeTruthy());
    expect(getByText(/placar será transmitido/)).toBeTruthy();
  });

  it("renders SAQUE indicator in live step", async () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} route={{}} />);
    await enterCodeAndGoToBracket(getAllByLabelText, getByText);
    fireEvent.press(getByText("Apitar esta partida"));
    await waitFor(() => expect(getByText("Pré-jogo")).toBeTruthy());
    fireEvent.press(getByText("Iniciar partida"));
    await waitFor(() => expect(getByText("AO VIVO")).toBeTruthy());
    expect(getByText("SAQUE")).toBeTruthy();
  });

  it("skips to bracket step when tournamentId provided", async () => {
    mockGetBracket.mockResolvedValue(MOCK_BRACKET);
    const { getByText } = render(
      <RefereeScreen navigation={mockNavigation} route={{ params: { tournamentId: "t-1" } }} />
    );
    await waitFor(() => expect(getByText("Selecionar partida")).toBeTruthy());
    expect(getByText("Silva & Rocha")).toBeTruthy();
  });
});
