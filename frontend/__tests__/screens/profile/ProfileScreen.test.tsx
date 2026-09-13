import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: { getState: () => ({ logout: jest.fn() }) },
}));

jest.mock("@/services/authService", () => ({
  authService: { logout: jest.fn().mockResolvedValue(undefined) },
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("ProfileScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders profile info with name and username", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Lucas Costa")).toBeTruthy();
    expect(getByText(/@lucascosta/)).toBeTruthy();
  });

  // Hoje so existe o selo de ATLETA: o papel de organizador deixou de ser exibido no perfil.
  it("renders the athlete badge", () => {
    const { getByText, queryByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("ATLETA")).toBeTruthy();
    expect(queryByText("ORGANIZADOR")).toBeNull();
  });

  it("renders stats bar with 3 items", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Torneios")).toBeTruthy();
    expect(getByText("Vitórias")).toBeTruthy();
    expect(getByText("Win rate")).toBeTruthy();
  });

  // "Links rapidos" virou a secao "Definicoes", com Configuracoes e Sair da conta.
  it("renders the settings section", () => {
    const { getByText, getByLabelText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Definições")).toBeTruthy();
    expect(getByLabelText("Configurações")).toBeTruthy();
  });

  it("renders recent tournaments section", () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText("Torneios recentes")).toBeTruthy();
    expect(getByText("Copa Verão Beach 2026")).toBeTruthy();
  });

  it("navigates back on back press", () => {
    const { getByLabelText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("enters edit mode on more button press", () => {
    const { getByLabelText, getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Editar perfil"));
    expect(getByText("Editar perfil")).toBeTruthy();
    expect(getByLabelText("Nome de usuário")).toBeTruthy();
    expect(getByLabelText("Bio")).toBeTruthy();
  });

  // Sair da conta saiu do modo de edicao: hoje fica na secao Definicoes, na visao normal.
  it("shows the logout button in the normal view", () => {
    const { getByLabelText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByLabelText("Sair da conta")).toBeTruthy();
  });

  it("saves and exits edit mode", async () => {
    const { getByLabelText, queryByLabelText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Editar perfil"));
    fireEvent.press(getByLabelText("Salvar perfil"));
    await waitFor(() => expect(queryByLabelText("Nome de usuário")).toBeNull());
  });
});
