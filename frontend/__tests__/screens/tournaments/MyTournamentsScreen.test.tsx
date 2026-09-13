import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MyTournamentsScreen } from "@/screens/tournaments/MyTournamentsScreen";

// A tela le os torneios do organizador por useApi e mapeia status/rotulo a partir do backend.
// Antes havia dado fixo embutido na tela; o teste dependia dele e ficou orfao quando saiu.
const mockTorneios = [
  {
    id: "t1",
    name: "Copa Verão Beach 2026",
    status: "REGISTRATION_OPEN",
    stages: [{ date: "2026-12-10T00:00:00.000Z", city: "Santos", state: "SP" }],
    _count: { registrations: 12 },
  },
  {
    id: "t2",
    name: "Circuito Indoor SP",
    status: "DRAFT",
    stages: [{ date: "2027-01-15T00:00:00.000Z", city: "São Paulo", state: "SP" }],
    _count: { registrations: 0 },
  },
  {
    id: "t4",
    name: "Torneio de Inverno",
    status: "IN_PROGRESS",
    stages: [{ date: "2026-06-01T00:00:00.000Z", city: "Guarujá", state: "SP" }],
    _count: { registrations: 16 },
  },
  {
    id: "t3",
    name: "Liga Municipal Vôlei",
    status: "FINISHED",
    stages: [{ date: "2025-11-02T00:00:00.000Z", city: "Campinas", state: "SP" }],
    _count: { registrations: 8 },
  },
];

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: mockTorneios, loading: false, error: null, refetch: jest.fn() }),
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
    expect(getByText("Rascunho")).toBeTruthy();
    expect(getByText("EM ANDAMENTO")).toBeTruthy();
  });

  it("renders action labels", () => {
    const { getByText } = render(<MyTournamentsScreen navigation={mockNavigation} />);
    expect(getByText("Gerenciar →")).toBeTruthy();
    expect(getByText("Editar →")).toBeTruthy();
    expect(getByText("Ver partidas →")).toBeTruthy();
  });
});
