import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button, IconButton } from "@/components/ui/Button";

jest.mock("react-native-reanimated", () => {
  const View = require("react-native").View;
  return {
    default: { createAnimatedComponent: (c: any) => c },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    createAnimatedComponent: (c: any) => c,
  };
});

describe("Button", () => {
  it("renders children text", () => {
    const { getByText } = render(<Button>Entrar</Button>);
    expect(getByText("Entrar")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click</Button>);
    fireEvent.press(getByText("Click"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button onPress={onPress} disabled>Click</Button>);
    fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows loading indicator", () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button loading>Loading</Button>,
    );
    expect(queryByText("Loading")).toBeNull();
  });

  it("renders each variant without crash", () => {
    const variants = ["primary", "ghost", "tertiary", "danger"] as const;
    variants.forEach((v) => {
      const { toJSON } = render(<Button variant={v}>Test</Button>);
      expect(toJSON()).toBeTruthy();
    });
  });
});

describe("IconButton", () => {
  it("renders icon and handles press", () => {
    const onPress = jest.fn();
    const { getByRole } = render(<IconButton icon="close" onPress={onPress} />);
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });
});
