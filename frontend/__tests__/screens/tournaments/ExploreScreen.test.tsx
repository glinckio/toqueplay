import React from "react";
import { render } from "@testing-library/react-native";
import { ExploreScreen } from "@/screens/tournaments/ExploreScreen";

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

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@react-navigation/native-stack", () => ({
  NativeStackNavigationProp: class {},
}));

describe("ExploreScreen", () => {
  it("renders screen title", () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText("Torneios")).toBeTruthy();
  });

  it("renders search input placeholder", () => {
    const { getByPlaceholderText } = render(<ExploreScreen />);
    expect(getByPlaceholderText(/Buscar torneio ou cidade/)).toBeTruthy();
  });

  it("renders filter chips", () => {
    const { getAllByText } = render(<ExploreScreen />);
    expect(getAllByText("Todos").length).toBeGreaterThanOrEqual(1);
  });

  it("renders open tournaments section", () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText("INSCRIÇÕES ABERTAS")).toBeTruthy();
  });

  it("renders closed tournaments section", () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText("ENCERRADOS")).toBeTruthy();
  });

  it("renders tournament cards with names", () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText("Copa Verão 2026")).toBeTruthy();
  });
});
