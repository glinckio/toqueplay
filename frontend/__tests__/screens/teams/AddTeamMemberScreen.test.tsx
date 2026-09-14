import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { AddTeamMemberScreen } from "@/screens/teams/AddTeamMemberScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-keyboard-controller", () => ({
  KeyboardAvoidingView: "KeyboardAvoidingView",
}));

jest.mock("@/services/teamsService", () => ({
  teamsService: { addMember: jest.fn().mockResolvedValue({ id: "invite-1" }) },
}));

import { teamsService } from "@/services/teamsService";

const addMember = teamsService.addMember as jest.Mock;
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const route = { params: { teamId: "team-1", teamName: "Beach Titans" } };

const renderTela = () =>
  render(<AddTeamMemberScreen navigation={mockNavigation} route={route} />);

describe("AddTeamMemberScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addMember.mockResolvedValue({ id: "invite-1" });
  });

  it("comeca no modo email", () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText("Email do jogador")).toBeTruthy();
  });

  it("envia o email digitado", async () => {
    const { getByLabelText, getByText } = renderTela();

    fireEvent.changeText(getByLabelText("Email do jogador"), "jogador@test.com");
    fireEvent.press(getByText("Enviar convite"));

    await waitFor(() =>
      expect(addMember).toHaveBeenCalledWith("team-1", { email: "jogador@test.com" }),
    );
  });

  // O dono nem sempre sabe o e-mail de cadastro do atleta — o CPF e a segunda via de busca.
  it("troca para CPF e envia so os digitos", async () => {
    const { getByLabelText, getByText } = renderTela();

    fireEvent.press(getByLabelText("Buscar por CPF"));
    fireEvent.changeText(getByLabelText("CPF do jogador"), "12345678901");
    fireEvent.press(getByText("Enviar convite"));

    await waitFor(() =>
      expect(addMember).toHaveBeenCalledWith("team-1", { cpf: "12345678901" }),
    );
  });

  it("mascara o CPF enquanto digita", () => {
    const { getByLabelText } = renderTela();

    fireEvent.press(getByLabelText("Buscar por CPF"));
    const campo = getByLabelText("CPF do jogador");
    fireEvent.changeText(campo, "12345678901");

    expect(campo.props.value).toBe("123.456.789-01");
  });

  // CPF incompleto nao e identidade valida: o botao nao pode chamar a API.
  it("nao envia CPF incompleto", () => {
    const { getByLabelText, getByText } = renderTela();

    fireEvent.press(getByLabelText("Buscar por CPF"));
    fireEvent.changeText(getByLabelText("CPF do jogador"), "1234");
    fireEvent.press(getByText("Enviar convite"));

    expect(addMember).not.toHaveBeenCalled();
  });

  it("nao envia email sem @", () => {
    const { getByLabelText, getByText } = renderTela();

    fireEvent.changeText(getByLabelText("Email do jogador"), "jogador");
    fireEvent.press(getByText("Enviar convite"));

    expect(addMember).not.toHaveBeenCalled();
  });

  it("mostra o erro da API", async () => {
    addMember.mockRejectedValue({
      response: { data: { code: "USER_NOT_FOUND_BY_CPF" } },
    });
    const { getByLabelText, getByText } = renderTela();

    fireEvent.press(getByLabelText("Buscar por CPF"));
    fireEvent.changeText(getByLabelText("CPF do jogador"), "12345678901");
    fireEvent.press(getByText("Enviar convite"));

    await waitFor(() =>
      expect(getByText("Nenhum usuário encontrado com esse CPF.")).toBeTruthy(),
    );
  });
});
