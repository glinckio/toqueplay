import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FriendlyDetailScreen } from "@/screens/friendlies/FriendlyDetailScreen";

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

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: { id: "f1" } };

describe("FriendlyDetailScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders team names in confronto", () => {
    const { getAllByText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getAllByText("Silva & Rocha").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText("Beach Titans").length).toBeGreaterThanOrEqual(1);
  });

  it("renders status badge", () => {
    const { getByText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("ACEITO")).toBeTruthy();
  });

  it("renders match info (date, time, location, modality)", () => {
    const { getByText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("22 de Agosto, 2026")).toBeTruthy();
    expect(getByText("16:00")).toBeTruthy();
    expect(getByText("Areia · Dupla")).toBeTruthy();
  });

  it("renders team members with captain badge", () => {
    const { getByText, getAllByText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("Lucas Costa")).toBeTruthy();
    expect(getByText("Rafael Silva")).toBeTruthy();
    expect(getByText("Pedro Alves")).toBeTruthy();
    expect(getAllByText("CAPITÃO").length).toBe(2);
  });

  it("renders referee code for accepted status", () => {
    const { getByText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("CÓDIGO DO ÁRBITRO")).toBeTruthy();
    expect(getByText("483927")).toBeTruthy();
  });

  it("renders action buttons for accepted status", () => {
    const { getByLabelText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByLabelText("Gerar código de árbitro")).toBeTruthy();
    expect(getByLabelText("Cancelar amistoso")).toBeTruthy();
  });

  it("navigates back on back press", () => {
    const { getByLabelText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("renders team section labels", () => {
    const { getByText } = render(<FriendlyDetailScreen navigation={mockNavigation} route={mockRoute} />);
    expect(getByText("TIME SOLICITANTE")).toBeTruthy();
    expect(getByText("TIME DESAFIADO")).toBeTruthy();
  });
});
