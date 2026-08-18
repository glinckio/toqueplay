import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PrivacyScreen } from "@/screens/privacy/PrivacyScreen";

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

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("PrivacyScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Privacidade & LGPD")).toBeTruthy();
  });

  it("renders consent toggles", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Notificações push")).toBeTruthy();
    expect(getByText("Localização")).toBeTruthy();
    expect(getByText("Emails de marketing")).toBeTruthy();
  });

  it("renders data summary", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("SEUS DADOS")).toBeTruthy();
    expect(getByText("Times")).toBeTruthy();
    expect(getByText("Torneios")).toBeTruthy();
    expect(getByText("Partidas")).toBeTruthy();
  });

  it("renders action buttons", () => {
    const { getByLabelText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByLabelText("Exportar meus dados")).toBeTruthy();
    expect(getByLabelText("Contato DPO")).toBeTruthy();
    expect(getByLabelText("Excluir minha conta")).toBeTruthy();
  });

  it("renders LGPD article references", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("LGPD Art. 18, V — Portabilidade")).toBeTruthy();
    expect(getByText("LGPD Art. 18, VI — Eliminação")).toBeTruthy();
  });

  it("navigates back", () => {
    const { getByLabelText } = render(<PrivacyScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("renders consent descriptions", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Receber notificações sobre partidas e torneios")).toBeTruthy();
    expect(getByText("Usar localização para descobrir torneios próximos")).toBeTruthy();
  });
});
