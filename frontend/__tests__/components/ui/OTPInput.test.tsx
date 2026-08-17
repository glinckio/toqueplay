import React from "react";
import { render } from "@testing-library/react-native";
import { OTPInput } from "@/components/ui/OTPInput";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: { text: { primary: "#F5F3FA" } },
  }),
}));

describe("OTPInput", () => {
  it("renders 6 boxes by default", () => {
    const { toJSON } = render(<OTPInput value="" onChange={() => {}} />);
    expect(toJSON()).toBeTruthy();
  });

  it("shows filled digits", () => {
    const { getByText } = render(<OTPInput value="123" onChange={() => {}} />);
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
  });

  it("shows error message", () => {
    const { getByText } = render(
      <OTPInput value="" onChange={() => {}} error="Código inválido" />,
    );
    expect(getByText("Código inválido")).toBeTruthy();
  });
});
