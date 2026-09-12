import React from "react";
import { render } from "@testing-library/react-native";
import { TeamDetailScreen } from "@/screens/teams/TeamDetailScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { id: "team-1" } };

describe("TeamDetailScreen", () => {
  it("renders team name and format", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Dupla · Areia")).toBeTruthy();
  });

  it("renders stats section", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("3")).toBeTruthy();
    expect(getByText("67%")).toBeTruthy();
    expect(getByText("Torneios")).toBeTruthy();
  });

  it("renders members list with roles", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Lucas Costa")).toBeTruthy();
    expect(getByText("Rafael Silva")).toBeTruthy();
    expect(getByText("CAPITÃO")).toBeTruthy();
    expect(getByText("MEMBRO")).toBeTruthy();
  });

  it("renders history section", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("HISTÓRICO")).toBeTruthy();
    expect(getByText("Sem histórico")).toBeTruthy();
  });

  it("renders edit button", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Editar")).toBeTruthy();
  });

  it("renders invite link", () => {
    const { getByText } = render(<TeamDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("+ Convidar")).toBeTruthy();
  });
});
