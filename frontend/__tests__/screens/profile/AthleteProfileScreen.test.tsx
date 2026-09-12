import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AthleteProfileScreen } from "@/screens/profile/AthleteProfileScreen";
import { usersService } from "@/services/usersService";
import { useAuthStore } from "@/stores/authStore";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Svg: "Svg",
  Path: "Path",
  Circle: "Circle",
  Rect: "Rect",
  Line: "Line",
  Polyline: "Polyline",
  G: "G",
  Defs: "Defs",
  ClipPath: "ClipPath",
}));

jest.mock("@/stores/authStore", () => ({
  useAuthStore: jest.fn(),
}));

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockRoute = { params: { id: "other-user" } };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ user: { id: "current-user" } })
  );
  (usersService.getPublicProfile as jest.Mock).mockReturnValue({
    id: "other-user", name: "Lucas Costa", username: "lucascosta",
    email: "lucas@email.com", avatarUrl: null,
    bio: "Jogador de vôlei de praia", city: null, state: null,
    stats: { matchesPlayed: 12, matchesWon: 8, winRate: 67 },
  });
});

it("renders athlete name and stats", () => {
  const { getByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  expect(getByText("Lucas Costa")).toBeTruthy();
  expect(getByText("12")).toBeTruthy();
  expect(getByText("8")).toBeTruthy();
  expect(getByText("67%")).toBeTruthy();
});

it("renders bio and email", () => {
  const { getByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  expect(getByText("Jogador de vôlei de praia")).toBeTruthy();
  expect(getByText("lucas@email.com")).toBeTruthy();
});

it("renders ATLETA badge", () => {
  const { getByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  expect(getByText("ATLETA")).toBeTruthy();
});

it("shows invite button when athlete not in any team", () => {
  const { getByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  expect(getByText("CONVIDAR PARA TIME")).toBeTruthy();
});

it("opens team picker on invite button", () => {
  const { getByLabelText, getByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  fireEvent.press(getByLabelText("Convidar para time"));
  expect(getByText("Selecionar time")).toBeTruthy();
  expect(getByText("Silva & Rocha")).toBeTruthy();
  expect(getByText("Vôlei Norte")).toBeTruthy();
});

it("hides invite button when viewing own profile", () => {
  (useAuthStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ user: { id: "other-user" } })
  );
  const { queryByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  expect(queryByText("CONVIDAR PARA TIME")).toBeNull();
});

it("excludes teams athlete is already in from picker", () => {
  (usersService.getPublicProfile as jest.Mock).mockReturnValue({
    id: "u1", name: "Lucas Costa", email: "lucas@email.com",
    avatarUrl: null, bio: null, city: null, state: null,
    stats: { matchesPlayed: 0, matchesWon: 0, winRate: 0 },
  });
  const routeWithMember = { params: { id: "u1" } };
  const { getByLabelText, queryByText, getByText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={routeWithMember} />
  );
  fireEvent.press(getByLabelText("Convidar para time"));
  expect(queryByText("Silva & Rocha")).toBeNull();
  expect(getByText("Vôlei Norte")).toBeTruthy();
});

it("navigates back on back press", () => {
  const { getByLabelText } = render(
    <AthleteProfileScreen navigation={mockNavigation} route={mockRoute} />
  );
  fireEvent.press(getByLabelText("Voltar"));
  expect(mockNavigation.goBack).toHaveBeenCalled();
});
