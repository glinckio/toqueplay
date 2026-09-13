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
    expect(getByText("Nome do time")).toBeTruthy();
    expect(getByText("Modalidade")).toBeTruthy();
    expect(getByText("Formato")).toBeTruthy();
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

  // O convite de parceiro saiu desta tela: hoje acontece em Adicionar membro / Convite do time,
  // depois que o time existe. Nao ha o que checar aqui.

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
