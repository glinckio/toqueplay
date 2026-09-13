import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { MyFriendliesScreen } from "@/screens/friendlies/MyFriendliesScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

/**
 * A tela separa os amistosos por direção comparando `requesterId` com o usuário logado:
 * quem mandou o convite cai em "Enviados", quem recebeu em "Recebidos".
 */
const amistosos = [
  {
    id: "f1",
    requesterId: "user-1", // enviado por mim
    requesterTeam: { name: "Silva & Rocha", avatarUrl: null },
    challengedTeam: { name: "Beach Titans", avatarUrl: null },
    date: "2026-08-22T00:00:00.000Z",
    startTime: "2026-08-22T16:00:00.000Z",
    modality: "BEACH",
    status: "PENDING",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "f2",
    requesterId: "outro", // recebido
    requesterTeam: { name: "Sand Storm", avatarUrl: null },
    challengedTeam: { name: "Silva & Rocha", avatarUrl: null },
    date: "2026-08-30T00:00:00.000Z",
    startTime: "2026-08-30T09:00:00.000Z",
    modality: "INDOOR",
    status: "PENDING",
    createdAt: "2026-08-02T00:00:00.000Z",
  },
];

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: amistosos, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) => selector({ user: { id: "user-1" } }),
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

const renderTela = () => render(<MyFriendliesScreen navigation={mockNavigation} />);

describe("MyFriendliesScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title and both tabs", () => {
    const { getByText, getByLabelText } = renderTela();
    expect(getByText("Meus amistosos")).toBeTruthy();
    expect(getByLabelText("Recebidos")).toBeTruthy();
    expect(getByLabelText("Enviados")).toBeTruthy();
  });

  // A aba inicial e "Recebidos": o que exige acao do usuario vem primeiro.
  it("shows received friendlies by default", () => {
    const { getAllByText, queryByText } = renderTela();
    expect(getAllByText("Sand Storm").length).toBeGreaterThanOrEqual(1);
    expect(queryByText("Beach Titans")).toBeNull();
  });

  it("switches to the sent tab", () => {
    const utils = renderTela();
    fireEvent.press(utils.getByLabelText("Enviados"));
    expect(utils.getAllByText("Beach Titans").length).toBeGreaterThanOrEqual(1);
    expect(utils.queryByText("Sand Storm")).toBeNull();
  });

  it("navigates back on back press", () => {
    fireEvent.press(renderTela().getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
