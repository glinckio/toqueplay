import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ConsentGateScreen } from "@/screens/consent/ConsentGateScreen";
import { privacyService } from "@/services/privacyService";
import { useAuthStore } from "@/stores/authStore";

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

const mockSetHasAcceptedTerms = jest.fn();

jest.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: any) =>
    selector({
      setHasAcceptedTerms: mockSetHasAcceptedTerms,
    }),
}));

describe("ConsentGateScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title and description", () => {
    const { getAllByText, getByText } = render(<ConsentGateScreen />);
    expect(getAllByText(/Privacidade/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/Termos de Uso/).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Para continuar usando o ToquePlay/)).toBeTruthy();
  });

  it("renders all info cards", () => {
    const { getByText } = render(<ConsentGateScreen />);
    expect(getByText("Proteção de dados")).toBeTruthy();
    expect(getByText("Compartilhamento")).toBeTruthy();
    expect(getByText("Comunicações")).toBeTruthy();
    expect(getByText("Seus direitos")).toBeTruthy();
  });

  it("renders LGPD info in cards", () => {
    const { getByText } = render(<ConsentGateScreen />);
    expect(getByText(/Lei Geral de Proteção de Dados/)).toBeTruthy();
    expect(getByText(/não são vendidos a terceiros/)).toBeTruthy();
  });

  it("renders links", () => {
    const { getByLabelText } = render(<ConsentGateScreen />);
    expect(getByLabelText("Termos de uso")).toBeTruthy();
    expect(getByLabelText("Política de privacidade")).toBeTruthy();
  });

  it("renders accept button", () => {
    const { getByText } = render(<ConsentGateScreen />);
    expect(getByText("ACEITAR E CONTINUAR")).toBeTruthy();
  });

  it("calls acceptTerms and sets store on accept", async () => {
    const { getByLabelText } = render(<ConsentGateScreen />);
    fireEvent.press(getByLabelText("Aceitar e continuar"));
    await waitFor(() => {
      expect(privacyService.acceptTerms).toHaveBeenCalled();
      expect(mockSetHasAcceptedTerms).toHaveBeenCalledWith(true);
    });
  });

  it("still proceeds if API fails", async () => {
    (privacyService.acceptTerms as jest.Mock).mockRejectedValueOnce(new Error("offline"));
    const { getByLabelText } = render(<ConsentGateScreen />);
    fireEvent.press(getByLabelText("Aceitar e continuar"));
    await waitFor(() => {
      expect(mockSetHasAcceptedTerms).toHaveBeenCalledWith(true);
    });
  });
});
