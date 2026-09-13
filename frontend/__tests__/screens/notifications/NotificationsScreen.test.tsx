import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NotificationsScreen } from "@/screens/notifications/NotificationsScreen";

// A tela le `page.data` e esconde o que ja foi lido. Os grupos ("Hoje"/"Ontem") saem de
// createdAt, entao as datas sao relativas ao momento do teste.
const agora = new Date();
const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

const mockPagina = {
  data: [
    {
      id: "n1",
      read: false,
      title: "Inscrição confirmada",
      body: "Sua inscrição na Copa Verão 2026 foi confirmada.",
      type: "REGISTRATION_CONFIRMED",
      createdAt: agora.toISOString(),
    },
    {
      id: "n2",
      read: false,
      title: "Novo convite de time",
      body: "Beach Titans convidou você para a dupla.",
      type: "TEAM_INVITE",
      createdAt: agora.toISOString(),
    },
    {
      id: "n3",
      read: false,
      title: "Amistoso aceito",
      body: "Sand Storm aceitou seu desafio.",
      type: "FRIENDLY_ACCEPTED",
      createdAt: ontem.toISOString(),
    },
  ],
};

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: mockPagina, loading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("NotificationsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title and unread count", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Notificações")).toBeTruthy();
    // A tela so lista nao lidas: as tres da fixture estao por ler.
    expect(getByText("3")).toBeTruthy();
  });

  it("renders date groups", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Hoje")).toBeTruthy();
    expect(getByText("Ontem")).toBeTruthy();
  });

  it("renders notification items", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Inscrição confirmada")).toBeTruthy();
    expect(getByText("Novo convite de time")).toBeTruthy();
    expect(getByText("Amistoso aceito")).toBeTruthy();
  });

  it("marks notification as read on press", () => {
    const { getByLabelText, rerender } = render(<NotificationsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Inscrição confirmada"));
  });

  it("marks all as read", () => {
    const { getByLabelText } = render(<NotificationsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Marcar todas como lidas"));
  });

  it("navigates back", () => {
    const { getByLabelText } = render(<NotificationsScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("shows notification body text", () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    expect(getByText("Sua inscrição na Copa Verão 2026 foi confirmada.")).toBeTruthy();
    expect(getByText("Beach Titans convidou você para a dupla.")).toBeTruthy();
  });
});
