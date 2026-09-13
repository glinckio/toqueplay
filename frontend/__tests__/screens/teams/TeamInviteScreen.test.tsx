import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TeamInviteScreen } from "@/screens/teams/TeamInviteScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { id: "inv-1", teamName: "Beach Titans", teamInitials: "BT", inviterName: "Marcos Silva" } };

describe("TeamInviteScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders invite header and team info", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Convite de time")).toBeTruthy();
    expect(getByText("Você foi convidado!")).toBeTruthy();
    expect(getByText("Beach Titans")).toBeTruthy();
  });

  it("renders team members", () => {
    const { getByText, getAllByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Membros atuais")).toBeTruthy();
    expect(getAllByText("Marcos Silva").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Ana Costa")).toBeTruthy();
    expect(getByText("João Ferreira")).toBeTruthy();
  });

  it("renders accept and reject buttons", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Aceitar")).toBeTruthy();
    expect(getByText("Recusar")).toBeTruthy();
  });

  it("shows expiry info", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("6 dias")).toBeTruthy();
  });

  it("transitions to success view on accept", () => {
    const { getByText, queryByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByText("Aceitar"));
    expect(getByText("Você entrou no time!")).toBeTruthy();
    expect(getByText("Ver meu time")).toBeTruthy();
    expect(getByText("Voltar à home")).toBeTruthy();
  });

  it("calls goBack on reject", () => {
    const { getByText } = render(<TeamInviteScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByText("Recusar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
