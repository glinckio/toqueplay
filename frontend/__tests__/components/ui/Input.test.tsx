import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Input } from "@/components/ui/Input";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", tertiary: "#A9A2BC", muted: "#948CA8", disabled: "#6E6684" },
    },
  }),
}));

describe("Input", () => {
  it("renders label", () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText("Email")).toBeTruthy();
  });

  it("shows error message", () => {
    const { getByText } = render(<Input error="Campo obrigatório" />);
    expect(getByText("Campo obrigatório")).toBeTruthy();
  });

  it("calls onChangeText", () => {
    const onChange = jest.fn();
    const { getByDisplayValue } = render(
      <Input value="" onChangeText={onChange} placeholder="Type" />,
    );
    fireEvent.changeText(getByDisplayValue(""), "hello");
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("toggles secure entry", () => {
    const { toJSON } = render(<Input secureTextEntry value="123" onChangeText={() => {}} />);
    expect(toJSON()).toBeTruthy();
  });
});
