import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { MyRegistrationsScreen } from "@/screens/registrations/MyRegistrationsScreen";
import { RegistrationDTO } from "@/services/registrationsService";
import { RegistrationStatus, TournamentType, TournamentFormat, TournamentModality } from "@/types/enums";

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

function makeReg(overrides: Partial<RegistrationDTO> = {}): RegistrationDTO {
  return {
    id: "reg-1",
    tournamentId: "t-1",
    categoryId: "cat-1",
    teamId: "team-1",
    userId: "u-1",
    status: RegistrationStatus.CONFIRMED,
    paidAt: "2026-08-12T10:00:00Z",
    createdAt: "2026-08-12T10:00:00Z",
    updatedAt: "2026-08-12T10:00:00Z",
    tournament: { id: "t-1", name: "Copa Verão Beach 2026", status: "REGISTRATION_OPEN" },
    category: {
      id: "cat-1",
      type: TournamentType.MALE,
      format: TournamentFormat.PAIR,
      modality: TournamentModality.BEACH,
      registrationPrice: 120,
    },
    team: { id: "team-1", name: "Beach Titans" },
    user: { id: "u-1", name: "Lucas", email: "lucas@test.com" },
    members: [],
    ...overrides,
  };
}

const mockListMine = jest.fn();

jest.mock("@/services/registrationsService", () => ({
  registrationsService: {
    listMine: (...args: unknown[]) => mockListMine(...args),
    findOne: jest.fn(),
    cancel: jest.fn(),
    registerTeam: jest.fn(),
    getRegisteredMembers: jest.fn(),
  },
}));

const mockNavigation = { goBack: jest.fn() } as any;

describe("MyRegistrationsScreen", () => {
  beforeEach(() => {
    mockListMine.mockReset();
  });

  it("renders screen title", () => {
    mockListMine.mockResolvedValue([]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    expect(getByText("Minhas inscrições")).toBeTruthy();
  });

  it("shows empty state when no registrations", async () => {
    mockListMine.mockResolvedValue([]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText("Nenhuma inscrição ainda")).toBeTruthy());
  });

  it("renders PAGO status pill for confirmed registration", async () => {
    mockListMine.mockResolvedValue([makeReg({ status: RegistrationStatus.CONFIRMED })]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText("PAGO")).toBeTruthy());
    expect(getByText("Copa Verão Beach 2026")).toBeTruthy();
    expect(getByText("Beach Titans")).toBeTruthy();
    expect(getByText("Dupla Masculina")).toBeTruthy();
  });

  it("renders PENDENTE pill and pending notice for pending registration", async () => {
    mockListMine.mockResolvedValue([makeReg({ status: RegistrationStatus.PENDING_CONFIRMATION })]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText("PENDENTE")).toBeTruthy());
    expect(getByText("Pagamento pendente de confirmação pelo organizador.")).toBeTruthy();
  });

  it("renders RECUSADA pill for rejected registration", async () => {
    mockListMine.mockResolvedValue([makeReg({ status: RegistrationStatus.REJECTED })]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText("RECUSADA")).toBeTruthy());
  });

  it("renders CANCELADA pill for cancelled registration", async () => {
    mockListMine.mockResolvedValue([makeReg({ status: RegistrationStatus.CANCELLED })]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText("CANCELADA")).toBeTruthy());
  });

  it("shows quarteto category for QUARTET format", async () => {
    mockListMine.mockResolvedValue([
      makeReg({
        category: {
          id: "cat-2",
          type: TournamentType.MIX,
          format: TournamentFormat.QUARTET,
          modality: TournamentModality.COURT,
          registrationPrice: 160,
        },
      }),
    ]);
    const { getByText } = render(<MyRegistrationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText("Quarteto Mista")).toBeTruthy());
    expect(getByText("Quadra")).toBeTruthy();
  });
});
