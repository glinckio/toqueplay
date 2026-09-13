import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { CreateFriendlyScreen } from "@/screens/friendlies/CreateFriendlyScreen";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("react-native-svg", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: "Svg",
    Path: "Path",
    Circle: "Circle",
    Rect: "Rect",
    Line: "Line",
    Polyline: "Polyline",
  };
});

const mockTeams = [
  {
    id: "t1",
    name: "Silva & Rocha",
    avatarUrl: null,
    ownerId: "u1",
    members: [],
    _count: { members: 2 },
  },
  {
    id: "t2",
    name: "Vôlei Norte",
    avatarUrl: null,
    ownerId: "u1",
    members: [],
    _count: { members: 4 },
  },
];

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    data: mockTeams,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/services/teamsService", () => ({
  teamsService: {
    list: jest.fn(),
    search: jest.fn().mockResolvedValue({ items: [], hasMore: false, nextOffset: null }),
  },
}));

jest.mock("@/services/friendliesService", () => ({
  friendliesService: { create: jest.fn() },
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

describe("CreateFriendlyScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders form with title and team selector", () => {
    const { getByText, getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByText("Desafiar time")).toBeTruthy();
    expect(getByText("Meu time")).toBeTruthy();
    expect(getByLabelText("Selecionar meu time")).toBeTruthy();
  });

  it("renders modality options", () => {
    const { getByText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByText("Areia")).toBeTruthy();
    expect(getByText("Quadra")).toBeTruthy();
  });

  it("opens team modal and selects team", () => {
    const { getByLabelText, getByText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Selecionar meu time"));
    expect(getByText("Selecionar meu time")).toBeTruthy();
    fireEvent.press(getByLabelText("Selecionar Silva & Rocha"));
    expect(getByText("Silva & Rocha")).toBeTruthy();
  });

  it("navigates back on back press", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    fireEvent.press(getByLabelText("Voltar"));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it("has date and time inputs", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByLabelText("Data do amistoso")).toBeTruthy();
    expect(getByLabelText("Horário do amistoso")).toBeTruthy();
  });

  it("has opponent search button", () => {
    const { getByLabelText } = render(<CreateFriendlyScreen navigation={mockNavigation} />);
    expect(getByLabelText("Buscar adversário")).toBeTruthy();
  });
});
