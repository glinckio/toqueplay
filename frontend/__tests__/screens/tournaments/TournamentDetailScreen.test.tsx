import React from "react";
import { render } from "@testing-library/react-native";
import { TournamentDetailScreen } from "@/screens/tournaments/TournamentDetailScreen";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", secondary: "#CFC8E0", tertiary: "#A9A2BC", muted: "#948CA8", disabled: "#6E6684" },
    },
    brand: { primary: "#7C3AED", accentLime: "#C6F82A" },
    shadows: { none: {}, sm: {}, md: {}, deeper: {}, lg: {}, purpleGlow: {}, purpleGlowSm: {} },
    semantic: {},
    toggle: jest.fn(),
  }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { goBack: jest.fn() } as any;

describe("TournamentDetailScreen", () => {
  it("renders tournament title", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("Copa Verão 2026")).toBeTruthy();
  });

  it("renders open badge", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("INSCRIÇÕES ABERTAS")).toBeTruthy();
  });

  it("renders quick info chips", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("12 Jul 2026")).toBeTruthy();
    expect(getByText("08:00")).toBeTruthy();
    expect(getByText("Praia Grande, SP")).toBeTruthy();
  });

  it("renders organizer", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("Marcos Costa")).toBeTruthy();
    expect(getByText("Organizador")).toBeTruthy();
  });

  it("renders sections", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("SOBRE O TORNEIO")).toBeTruthy();
    expect(getByText("REGRAS")).toBeTruthy();
    expect(getByText("CATEGORIAS")).toBeTruthy();
    expect(getByText("PREMIAÇÃO")).toBeTruthy();
    expect(getByText("TIMES CONFIRMADOS")).toBeTruthy();
    expect(getByText("LOCAL")).toBeTruthy();
  });

  it("renders CTA button", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("Inscrever meu time")).toBeTruthy();
  });

  it("renders confirmed teams", () => {
    const { getByText } = render(<TournamentDetailScreen navigation={mockNavigation} />);
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText("Vôlei Norte")).toBeTruthy();
  });
});
