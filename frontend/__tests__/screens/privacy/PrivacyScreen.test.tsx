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
    expect(getByText("Privacidade")).toBeTruthy();
  });

  it("renders shield header card", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText(/Seus dados est.o protegidos/)).toBeTruthy();
    expect(getByText(/LGPD .* Lei 13.709\/2018/)).toBeTruthy();
  });

  it("renders consent section", () => {
    const { getByText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Consentimentos")).toBeTruthy();
  });

  it("renders MEUS DADOS section with rows", () => {
    const { getByText, getByLabelText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Meus dados")).toBeTruthy();
    expect(getByLabelText("Exportar meus dados")).toBeTruthy();
    expect(getByText(/Download em JSON/)).toBeTruthy();
  });

  it("renders DPO section", () => {
    const { getByText, getByLabelText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Encarregado de dados (DPO)")).toBeTruthy();
    expect(getByText("dpo@toqueplay.com.br")).toBeTruthy();
    expect(getByLabelText("Enviar mensagem ao DPO")).toBeTruthy();
  });

  it("renders danger zone", () => {
    const { getByText, getByLabelText } = render(<PrivacyScreen navigation={mockNavigation} />);
    expect(getByText("Zona de perigo")).toBeTruthy();
    expect(getByText("Excluir minha conta")).toBeTruthy();
    expect(getByLabelText("Excluir conta")).toBeTruthy();
  });

  it("navigates back", () => {
    const { getByLabelText } = render(<PrivacyScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
