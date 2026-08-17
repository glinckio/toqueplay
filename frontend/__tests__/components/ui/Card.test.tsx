import React from "react";
import { Text } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import { Card } from "@/components/ui/Card";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    shadows: { none: {}, sm: {}, md: {}, deeper: {}, lg: {}, purpleGlow: {}, purpleGlowSm: {} },
  }),
}));

describe("Card", () => {
  it("renders children", () => {
    const { getByText } = render(
      <Card><Text>Content</Text></Card>,
    );
    expect(getByText("Content")).toBeTruthy();
  });

  it("handles press when onPress provided", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card onPress={onPress}><Text>Pressable</Text></Card>,
    );
    fireEvent.press(getByText("Pressable"));
    expect(onPress).toHaveBeenCalled();
  });
});
