import React from "react";
import { render } from "@testing-library/react-native";
import { Banner } from "@/components/ui/Banner";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isDark: true }),
}));

describe("Banner", () => {
  it("renders warning variant", () => {
    const { getByText } = render(<Banner variant="warning" message="Atenção!" />);
    expect(getByText("Atenção!")).toBeTruthy();
  });

  it("renders error variant", () => {
    const { getByText } = render(<Banner variant="error" message="Erro!" />);
    expect(getByText("Erro!")).toBeTruthy();
  });

  it("renders info variant", () => {
    const { getByText } = render(<Banner variant="info" message="Info" />);
    expect(getByText("Info")).toBeTruthy();
  });
});
