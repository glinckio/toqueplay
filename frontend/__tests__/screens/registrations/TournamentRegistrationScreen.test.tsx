import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { TournamentRegistrationScreen } from "@/screens/registrations/TournamentRegistrationScreen";

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

jest.mock("@/services/tournamentsService", () => ({
  tournamentsService: {
    findOne: jest.fn().mockReturnValue(null),
  },
}));

jest.mock("@/services/teamsService", () => ({
  teamsService: {
    list: jest.fn().mockReturnValue(null),
  },
}));

const mockRegisterTeam = jest.fn();

jest.mock("@/services/registrationsService", () => ({
  registrationsService: {
    listMine: jest.fn(),
    findOne: jest.fn(),
    cancel: jest.fn(),
    registerTeam: (...args: unknown[]) => mockRegisterTeam(...args),
    getRegisteredMembers: jest.fn(),
  },
  RegistrationDTO: {},
}));

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const mockRoute = {
  params: { tournamentId: "t-1", tournamentName: "Copa Verão 2026", tournamentLocation: "Praia Grande" },
} as any;

function renderScreen() {
  return render(<TournamentRegistrationScreen navigation={mockNavigation} route={mockRoute} />);
}

describe("TournamentRegistrationScreen — step 1", () => {
  beforeEach(() => mockRegisterTeam.mockReset());

  it("renders header with tournament name", () => {
    const { getByText } = renderScreen();
    expect(getByText("Inscrever time")).toBeTruthy();
    expect(getByText("Copa Verão 2026 · Praia Grande")).toBeTruthy();
  });

  it("renders category options", () => {
    const { getByText } = renderScreen();
    expect(getByText("Masculino")).toBeTruthy();
    expect(getByText("Misto")).toBeTruthy();
    expect(getByText("Dupla · Areia")).toBeTruthy();
    expect(getByText("Quarteto · Areia")).toBeTruthy();
  });

  it("renders team options with status", () => {
    const { getByText } = renderScreen();
    expect(getByText("Silva & Rocha")).toBeTruthy();
    expect(getByText("2 jogadores · pronto")).toBeTruthy();
    expect(getByText("Praia Aces")).toBeTruthy();
    expect(getByText(/Faltam jogadores/)).toBeTruthy();
  });

  it("continues to step 2 after selecting category and team", () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText("Masculino"));
    fireEvent.press(getByText("Silva & Rocha"));
    fireEvent.press(getByText("Continuar com Silva & Rocha"));
    expect(getByText("Selecionar atletas")).toBeTruthy();
    expect(getByText("Selecione 2 jogadores")).toBeTruthy();
  });
});

describe("TournamentRegistrationScreen — step 2", () => {
  beforeEach(() => mockRegisterTeam.mockReset());

  function goStep2() {
    const screen = renderScreen();
    fireEvent.press(screen.getByText("Masculino"));
    fireEvent.press(screen.getByText("Silva & Rocha"));
    fireEvent.press(screen.getByText("Continuar com Silva & Rocha"));
    return screen;
  }

  it("shows team captain label", () => {
    const { getByText } = renderScreen2();
    expect(getByText("CAPITÃO DO TIME")).toBeTruthy();
  });

  function renderScreen2() {
    return goStep2();
  }

  it("shows already registered member as disabled with label", () => {
    const { getByText } = renderScreen2();
    expect(getByText("Tiago Nunes")).toBeTruthy();
    expect(getByText("Já inscrito neste torneio")).toBeTruthy();
  });

  it("toggles athlete selection and updates counter", () => {
    const { getByText } = renderScreen2();
    expect(getByText("0/2")).toBeTruthy();
    fireEvent.press(getByText("Lucas Menezes"));
    expect(getByText("1/2")).toBeTruthy();
    fireEvent.press(getByText("Rafael Rocha"));
    expect(getByText("2/2")).toBeTruthy();
  });

  it("prevents selecting more than needed players", () => {
    const { getByText } = renderScreen2();
    fireEvent.press(getByText("Lucas Menezes"));
    fireEvent.press(getByText("Rafael Rocha"));
    fireEvent.press(getByText("Bruno Alves"));
    // counter stays 2/2, Bruno not selected
    expect(getByText("2/2")).toBeTruthy();
  });

  it("shows captain hint", () => {
    const { getByText } = renderScreen2();
    expect(getByText("Toque na estrela para definir o capitão da inscrição.")).toBeTruthy();
  });

  it("calls registerTeam on confirm and shows success step", async () => {
    mockRegisterTeam.mockResolvedValue({ id: "reg-1" });
    const { getByText } = renderScreen2();
    fireEvent.press(getByText("Lucas Menezes"));
    fireEvent.press(getByText("Rafael Rocha"));
    fireEvent.press(getByText("CONFIRMAR INSCRIÇÃO"));
    await waitFor(() => expect(mockRegisterTeam).toHaveBeenCalledWith("t-1", {
      teamId: "team-1",
      categoryId: "cat-1",
      memberIds: ["m1", "m2"],
      captainMemberId: "m1",
    }));
    await waitFor(() => expect(getByText(/Inscrição/)).toBeTruthy());
    expect(getByText(/registrada!/)).toBeTruthy();
    expect(getByText("R$ 120,00")).toBeTruthy();
    expect(getByText("PENDENTE DE CONFIRMAÇÃO")).toBeTruthy();
  });

  it("back button from step 2 returns to step 1", () => {
    const { getByText, getByLabelText } = renderScreen2();
    fireEvent.press(getByLabelText("Voltar"));
    expect(getByText("Inscrever time")).toBeTruthy();
  });
});
