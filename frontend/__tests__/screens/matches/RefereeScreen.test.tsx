import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RefereeScreen } from "@/screens/matches/RefereeScreen";

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

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("RefereeScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders code entry step", () => {
    const { getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    expect(getByText("Entrar como árbitro")).toBeTruthy();
    expect(getByText("Código da partida")).toBeTruthy();
    expect(getByText("Entrar na partida")).toBeTruthy();
  });

  it("renders 6 digit inputs", () => {
    const { getAllByLabelText } = render(<RefereeScreen navigation={mockNavigation} />);
    const digits = [1, 2, 3, 4, 5, 6].map((n) => getAllByLabelText(`Dígito ${n}`));
    expect(digits).toHaveLength(6);
  });

  it("transitions to pregame on valid code entry", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      const input = getAllByLabelText(`Dígito ${i}`)[0];
      fireEvent.changeText(input, String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    expect(getByText("Pré-jogo")).toBeTruthy();
    expect(getByText("CONECTADO")).toBeTruthy();
  });

  it("renders pregame matchup info", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    expect(getByText("CONFRONTO")).toBeTruthy();
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText("VS")).toBeTruthy();
  });

  it("renders pregame info rows", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    expect(getByText("Copa Verão 2026 · Praia Grande")).toBeTruthy();
    expect(getByText("12/07")).toBeTruthy();
    expect(getByText("14:30")).toBeTruthy();
    expect(getByText("Masc · Dupla")).toBeTruthy();
    expect(getByText("Melhor de 3")).toBeTruthy();
  });

  it("transitions to live scoring on start", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    fireEvent.press(getByText("Iniciar partida"));
    expect(getByText("AO VIVO")).toBeTruthy();
    expect(getByText("PONTO SR")).toBeTruthy();
    expect(getByText("PONTO PA")).toBeTruthy();
  });

  it("renders live scoring action bar", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    fireEvent.press(getByText("Iniciar partida"));
    expect(getByText("Timeout")).toBeTruthy();
    expect(getByText("Cartão")).toBeTruthy();
    expect(getByText("Trocar saque")).toBeTruthy();
    expect(getByText("Histórico")).toBeTruthy();
    expect(getByText("Desfazer último ponto")).toBeTruthy();
  });

  it("increments score on point press", () => {
    const { getAllByLabelText, getByText, getByLabelText, getAllByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    fireEvent.press(getByText("Iniciar partida"));

    fireEvent.press(getByLabelText("Ponto Silva & Rocha"));
    fireEvent.press(getByLabelText("Ponto Praia Aces"));
    expect(getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders info hint in code step", () => {
    const { getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    expect(getByText("Peça o código ao organizador da partida")).toBeTruthy();
  });

  it("renders live broadcast warning in pregame", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    expect(getByText(/placar será transmitido/)).toBeTruthy();
  });

  it("renders SAQUE indicator", () => {
    const { getAllByLabelText, getByText } = render(<RefereeScreen navigation={mockNavigation} />);
    for (let i = 1; i <= 6; i++) {
      fireEvent.changeText(getAllByLabelText(`Dígito ${i}`)[0], String(i));
    }
    fireEvent.press(getByText("Entrar na partida"));
    fireEvent.press(getByText("Iniciar partida"));
    expect(getByText("SAQUE")).toBeTruthy();
  });
});
