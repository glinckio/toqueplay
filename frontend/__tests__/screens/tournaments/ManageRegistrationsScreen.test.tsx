import React from "react";
import { render } from "@testing-library/react-native";
import { ManageRegistrationsScreen } from "@/screens/tournaments/ManageRegistrationsScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * A tela le inscricoes e torneio por useApi, nessa ordem. O dado vive aqui porque a tela deixou
 * de ter mock embutido quando passou a consumir a API — era disso que o teste antigo dependia.
 */
const membro = (nome: string, isCaptain = false) => ({
  isCaptain,
  teamMember: {
    id: `tm-${nome}`,
    guestName: null,
    isGuest: false,
    user: { id: `u-${nome}`, name: nome, avatarUrl: null },
  },
});

const categoria = {
  id: "c1",
  type: "MALE",
  format: "PAIR",
  modality: "BEACH",
  registrationPrice: 120,
};

const mockInscricoes = [
  {
    id: "r1",
    status: "PENDING_CONFIRMATION",
    paidAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    team: { id: "t1", name: "Beach Titans", avatarUrl: null },
    category: categoria,
    members: [membro("Lucas Costa", true), membro("Rafael Silva")],
  },
  {
    id: "r2",
    status: "CONFIRMED",
    paidAt: "2026-01-10T12:00:00.000Z",
    createdAt: "2026-01-02T00:00:00.000Z",
    team: { id: "t2", name: "Praia Aces", avatarUrl: null },
    category: categoria,
    members: [membro("Pedro Alves", true)],
  },
  {
    id: "r3",
    status: "PENDING_CONFIRMATION",
    paidAt: null,
    createdAt: "2026-01-03T00:00:00.000Z",
    team: { id: "t3", name: "Sand Rockets", avatarUrl: null },
    category: categoria,
    members: [membro("João Lima", true)],
  },
  {
    id: "r4",
    status: "REJECTED",
    paidAt: null,
    createdAt: "2026-01-04T00:00:00.000Z",
    team: { id: "t4", name: "Volley Flames", avatarUrl: null },
    category: categoria,
    members: [membro("Bruno Reis", true)],
  },
];

const mockTorneio = { name: "Copa Verão Beach 2026", categories: [categoria] };

jest.mock("@/hooks/useApi", () => {
  let chamada = 0;
  return {
    useApi: () => {
      // Primeira chamada = inscricoes, segunda = torneio (ordem em que a tela declara).
      const data = chamada++ % 2 === 0 ? mockInscricoes : mockTorneio;
      return { data, loading: false, error: null, refetch: jest.fn() };
    },
  };
});

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockRoute = { params: { tournamentId: "t1" } };

const renderTela = () =>
  render(<ManageRegistrationsScreen navigation={mockNavigation} route={mockRoute} />);

describe("ManageRegistrationsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the screen title", () => {
    expect(renderTela().getByText("Inscrições")).toBeTruthy();
  });

  // As abas mostram a contagem: e o resumo que o organizador olha primeiro.
  it("counts registrations per tab", () => {
    const { getByText } = renderTela();
    expect(getByText("Pendentes · 2")).toBeTruthy();
    expect(getByText("Pagas · 1")).toBeTruthy();
    expect(getByText("Recusadas · 1")).toBeTruthy();
  });

  // A aba inicial e "Pendentes": e o que exige acao do organizador. Pagas e recusadas ficam
  // nas outras abas, entao nao devem aparecer aqui.
  it("lists only the pending registrations on the default tab", () => {
    const { getAllByText, queryByText } = renderTela();
    expect(getAllByText("Beach Titans").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("Sand Rockets").length).toBeGreaterThanOrEqual(1);
    expect(queryByText("Praia Aces")).toBeNull();
    expect(queryByText("Volley Flames")).toBeNull();
  });
});
