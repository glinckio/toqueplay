import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CreateFriendlyScreen } from "@/screens/friendlies/CreateFriendlyScreen";

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

describe("CreateFriendlyScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders form with title and team selection", () => {
    const { getByText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByText("Criar amistoso")).toBeTruthy();
    expect(getByText("SEU TIME")).toBeTruthy();
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Vôlei Norte")).toBeTruthy();
  });

  it("renders modality and format options", () => {
    const { getByText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByText("Areia")).toBeTruthy();
    expect(getByText("Quadra")).toBeTruthy();
    expect(getByText("Dupla")).toBeTruthy();
    expect(getByText("Quarteto")).toBeTruthy();
    expect(getByText("Sexteto")).toBeTruthy();
  });

  it("selects team on press", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Selecionar Silva & Rocha"));
  });

  it("navigates back on back press", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("has date and time inputs", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByLabelText("Data do amistoso")).toBeTruthy();
    expect(getByLabelText("Horário do amistoso")).toBeTruthy();
  });

  it("has opponent search input", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByLabelText("Buscar adversário")).toBeTruthy();
  });
});
