import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FriendlyDetailScreen } from "@/screens/friendlies/FriendlyDetailScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

/**
 * A tela le o amistoso por useApi. Antes ela tinha dado fixo embutido e o teste dependia dele;
 * quando passou a consumir a API, as asserções ficaram órfãs. Agora a fixture mora aqui.
 */
const amistoso = {
  id: "f1",
  status: "ACCEPTED",
  requesterId: "user-1",
  requesterTeam: { id: "t1", name: "Silva & Rocha", avatarUrl: null },
  challengedTeam: { id: "t2", name: "Beach Titans", avatarUrl: null },
  date: "2026-08-22T00:00:00.000Z",
  startTime: "2026-08-22T16:00:00.000Z",
  modality: "BEACH",
  address: "Av. Atlântica",
  addressNumber: "1500",
  city: "Rio de Janeiro",
  state: "RJ",
  refereeCode: "483927",
};

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    data: amistoso,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) => selector({ user: { id: "user-1" } }),
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { id: "f1" } };

const renderTela = () =>
  render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);

describe("FriendlyDetailScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders both team names in the confronto", () => {
    const { getAllByText } = renderTela();
    expect(getAllByText("Silva & Rocha").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("Beach Titans").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the status badge", () => {
    expect(renderTela().getByText("ACEITO")).toBeTruthy();
  });

  // O codigo e desenhado digito a digito, cada um no seu quadradinho — nao existe um no de
  // texto com "483927" inteiro.
  it("renders the referee code when the friendly was accepted", () => {
    const { getByText, getAllByText } = renderTela();
    expect(getByText("Código do árbitro")).toBeTruthy();
    expect(getByText("Compartilhe com o árbitro")).toBeTruthy();
    expect(getAllByText("4").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("8").length).toBeGreaterThanOrEqual(1);
  });

  // Com codigo ja gerado, o botao de gerar some — so sobra cancelar.
  it("renders the requester actions for an accepted friendly", () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    expect(getByLabelText("Cancelar amistoso")).toBeTruthy();
    expect(queryByLabelText("Gerar código de árbitro")).toBeNull();
    expect(queryByLabelText("Aceitar amistoso")).toBeNull();
  });

  it("navigates back on back press", () => {
    fireEvent.press(renderTela().getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
