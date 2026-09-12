import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { TournamentDetailScreen } from "@/screens/tournaments/TournamentDetailScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-svg", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: "Svg",
    Path: "Path",
    Circle: "Circle",
    Rect: "Rect",
    Line: "Line",
    Polyline: "Polyline",
  };
});

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) => selector({ user: { id: "u1", name: "Test User" }, token: "tok" }),
}));

const mockNavigation = { goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn(), replace: jest.fn() } as any;
const mockRoute = { params: { id: "t1" } };

describe("TournamentDetailScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders tournament title", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Copa Verão 2026")).toBeTruthy();
  });

  it("renders open badge", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("INSCRIÇÕES ABERTAS")).toBeTruthy();
  });

  it("renders organizer", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Marcos Costa")).toBeTruthy();
    expect(getByText("Organizador")).toBeTruthy();
  });

  it("renders sections", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("SOBRE O TORNEIO")).toBeTruthy();
    expect(getByText("REGRAS")).toBeTruthy();
    expect(getByText("CATEGORIAS")).toBeTruthy();
    expect(getByText("PREMIAÇÃO")).toBeTruthy();
    expect(getByText("TIMES CONFIRMADOS")).toBeTruthy();
    expect(getByText("LOCAL")).toBeTruthy();
  });

  it("renders CTA button for non-owner", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Inscrever meu time")).toBeTruthy();
  });

  it("renders confirmed teams count", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("3 time(s) inscrito(s)")).toBeTruthy();
  });

  it("navigates to registration on CTA press", () => {
    const { getByLabelText } = render(<TournamentDetailScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByLabelText("Inscrever meu time"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Registration", expect.objectContaining({ tournamentId: "t1" }));
  });
});
