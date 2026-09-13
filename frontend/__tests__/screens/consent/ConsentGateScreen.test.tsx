import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ConsentGateScreen } from "@/screens/consent/ConsentGateScreen";
import { privacyService } from "@/services/privacyService";

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

jest.mock("@/services/privacyService", () => ({
  privacyService: { acceptTerms: jest.fn().mockResolvedValue({}) },
}));

/**
 * A tela e um Modal controlado por `visible` — sem a prop nao renderiza nada, entao todo
 * render aqui passa `visible`.
 *
 * O aceite so libera com as duas caixas marcadas (Termos e Politica), que e o que a LGPD
 * espera: consentimento por item, nao um "aceito tudo" implicito.
 */
const renderTela = () => render(<ConsentGateScreen visible />);

const marcarAmbas = (utils: ReturnType<typeof renderTela>) => {
  fireEvent.press(utils.getByLabelText("Termos de Uso"));
  fireEvent.press(utils.getByLabelText("Política de Privacidade"));
};

describe("ConsentGateScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title and description", () => {
    const { getByText, getAllByText } = renderTela();
    expect(getByText("Termos atualizados")).toBeTruthy();
    expect(getAllByText(/Termos de Uso/).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Para continuar usando o ToquePlay/)).toBeTruthy();
  });

  it("renders both consent rows", () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText("Termos de Uso")).toBeTruthy();
    expect(getByLabelText("Política de Privacidade")).toBeTruthy();
  });

  it("offers a link to read each document in full", () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText("Ler Termos de Uso")).toBeTruthy();
    expect(getByLabelText("Ler Política de Privacidade")).toBeTruthy();
  });

  it("renders accept button", () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText("Aceitar e continuar")).toBeTruthy();
  });

  // Consentimento por item: sem marcar as duas, o botao nao age.
  it("does not accept while a box is unchecked", () => {
    const utils = renderTela();
    fireEvent.press(utils.getByLabelText("Termos de Uso"));
    fireEvent.press(utils.getByLabelText("Aceitar e continuar"));
    expect(privacyService.acceptTerms).not.toHaveBeenCalled();
  });

  it("calls acceptTerms and sets store on accept", async () => {
    const utils = renderTela();
    marcarAmbas(utils);
    fireEvent.press(utils.getByLabelText("Aceitar e continuar"));

    await waitFor(() => {
      expect(privacyService.acceptTerms).toHaveBeenCalled();
      expect(mockSetHasAcceptedTerms).toHaveBeenCalledWith(true);
    });
  });

  // Falha de rede nao pode prender o usuario numa tela sem saida.
  it("still proceeds if API fails", async () => {
    (privacyService.acceptTerms as jest.Mock).mockRejectedValueOnce(new Error("offline"));
    const utils = renderTela();
    marcarAmbas(utils);
    fireEvent.press(utils.getByLabelText("Aceitar e continuar"));

    await waitFor(() => {
      expect(mockSetHasAcceptedTerms).toHaveBeenCalledWith(true);
    });
  });
});
