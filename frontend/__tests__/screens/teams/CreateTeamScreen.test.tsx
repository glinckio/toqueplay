import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CreateTeamScreen } from "@/screens/teams/CreateTeamScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("CreateTeamScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders create team form", () => {
    const { getAllByText, getByText, getByLabelText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getAllByText("Criar time").length).toBeGreaterThanOrEqual(1);
    expect(getByText("NOME DO TIME")).toBeTruthy();
    expect(getByText("MODALIDADE")).toBeTruthy();
    expect(getByText("SUPERFÍCIE")).toBeTruthy();
  });

  it("renders format options", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("Dupla")).toBeTruthy();
    expect(getByText("Quarteto")).toBeTruthy();
  });

  it("renders surface options", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("Areia")).toBeTruthy();
    expect(getByText("Quadra")).toBeTruthy();
  });

  it("renders invite section", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("CONVIDAR PARCEIRO")).toBeTruthy();
    expect(getByText("Ou compartilhar link de convite")).toBeTruthy();
  });

  it("renders avatar placeholder", () => {
    const { getByText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    expect(getByText("Adicionar logo")).toBeTruthy();
  });

  it("allows typing team name", () => {
    const { getByLabelText } = render(<CreateTeamScreen navigation={mockNavigation} />);
    const input = getByLabelText("Nome do time");
    fireEvent.changeText(input, "Beach Warriors");
    expect(input.props.value).toBe("Beach Warriors");
  });
});
