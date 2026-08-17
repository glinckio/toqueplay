import React from "react";
import { render } from "@testing-library/react-native";
import { Badge } from "@/components/ui/Badge";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isDark: true }),
}));

describe("Badge", () => {
  const statuses = [
    "paid", "accepted", "open", "pending", "rejected",
    "cancelled", "in_progress", "captain", "member",
  ] as const;

  statuses.forEach((status) => {
    it(`renders "${status}" badge`, () => {
      const { toJSON } = render(<Badge status={status} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  it("uses custom label", () => {
    const { getByText } = render(<Badge status="paid" label="CUSTOM" />);
    expect(getByText("CUSTOM")).toBeTruthy();
  });

  it("defaults to status label in Portuguese", () => {
    const { getByText } = render(<Badge status="pending" />);
    expect(getByText("PENDENTE")).toBeTruthy();
  });
});
