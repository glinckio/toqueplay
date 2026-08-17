import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Toggle } from "@/components/ui/Toggle";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock("react-native-reanimated", () => {
  const View = require("react-native").View;
  return {
    default: { createAnimatedComponent: () => View },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    interpolateColor: () => "#000",
    View,
  };
});

describe("Toggle", () => {
  it("calls onValueChange on press", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<Toggle value={false} onValueChange={onChange} />);
    fireEvent.press(getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire when disabled", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<Toggle value={false} onValueChange={onChange} disabled />);
    fireEvent.press(getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
