import React from "react";
import { render } from "@testing-library/react-native";
import { VisitorHomeScreen } from "@/screens/home/VisitorHomeScreen";

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigation = { navigate: jest.fn() } as any;

describe("VisitorHomeScreen", () => {
  it("renders header with app name and subtitle", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("ToquePlay")).toBeTruthy();
    expect(getByText("Descubra torneios perto de você")).toBeTruthy();
  });

  it("renders ENTRAR button in header", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Entrar")).toBeTruthy();
  });

  it("renders CTA banner with create account button", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Participe de torneios!")).toBeTruthy();
    expect(getByText("Criar conta grátis")).toBeTruthy();
  });

  it("renders location banner", () => {
    const { getAllByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getAllByText("Santos, SP").length).toBeGreaterThanOrEqual(1);
  });

  it("renders tournament cards with names", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Copa Verão Beach 2026")).toBeTruthy();
    expect(getByText("Liga Municipal Vôlei")).toBeTruthy();
    expect(getByText("Open de Santos")).toBeTruthy();
  });

  it("renders tournament section title", () => {
    const { getByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getByText("Torneios próximos")).toBeTruthy();
  });

  it("renders Ver detalhes buttons on cards", () => {
    const { getAllByText } = render(<VisitorHomeScreen navigation={mockNavigation} />);
    expect(getAllByText("Ver detalhes")).toHaveLength(3);
  });
});
