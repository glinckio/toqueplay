import React from "react";
import { render } from "@testing-library/react-native";
import { InfoRow } from "@/components/ui/InfoRow";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", muted: "#948CA8" },
    },
  }),
}));

describe("InfoRow", () => {
  it("renders icon, label and value", () => {
    const { getByText } = render(
      <InfoRow icon="calendar" label="Data" value="15/03/2026" />,
    );
    expect(getByText("Data")).toBeTruthy();
    expect(getByText("15/03/2026")).toBeTruthy();
  });
});
