import React from "react";
import { render } from "@testing-library/react-native";
import { ManageRegistrationsScreen } from "@/screens/tournaments/ManageRegistrationsScreen";

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

const mockNavigation = { goBack: jest.fn() } as any;

describe("ManageRegistrationsScreen", () => {
  it("renders screen title and subtitle", () => {
    const { getByText } = render(<ManageRegistrationsScreen navigation={mockNavigation} />);
    expect(getByText("Inscrições")).toBeTruthy();
    expect(getByText("Copa Verão Beach 2026 · Dupla Masculina")).toBeTruthy();
  });

  it("renders stats row", () => {
    const { getByText } = render(<ManageRegistrationsScreen navigation={mockNavigation} />);
    expect(getByText("Total")).toBeTruthy();
    expect(getByText("Pagos")).toBeTruthy();
    expect(getByText("Pendentes")).toBeTruthy();
    expect(getByText("Recusada")).toBeTruthy();
  });

  it("renders registration cards", () => {
    const { getByText } = render(<ManageRegistrationsScreen navigation={mockNavigation} />);
    expect(getByText("Beach Titans")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText("Sand Rockets")).toBeTruthy();
    expect(getByText("Volley Flames")).toBeTruthy();
  });

  it("renders status badges", () => {
    const { getAllByText } = render(<ManageRegistrationsScreen navigation={mockNavigation} />);
    expect(getAllByText("PENDENTE").length).toBe(2);
    expect(getByTextHelper(getAllByText, "PAGO")).toBeTruthy();
    expect(getByTextHelper(getAllByText, "RECUSADA")).toBeTruthy();
  });

  it("renders confirm payment buttons for pending", () => {
    const { getAllByText } = render(<ManageRegistrationsScreen navigation={mockNavigation} />);
    expect(getAllByText("Confirmar pgto").length).toBe(2);
  });

  it("renders confirmed date for paid registration", () => {
    const { getByText } = render(<ManageRegistrationsScreen navigation={mockNavigation} />);
    expect(getByText("Confirmado em 12/08/2026 às 14:30")).toBeTruthy();
  });
});

function getByTextHelper(getAllByText: any, text: string) {
  const results = getAllByText(text);
  return results.length > 0 ? results[0] : null;
}
