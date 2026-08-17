import React from "react";
import { render } from "@testing-library/react-native";
import { Avatar } from "@/components/ui/Avatar";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require("react-native");
    return <View {...props}>{children}</View>;
  },
}));

describe("Avatar", () => {
  it("renders initials", () => {
    const { getByText } = render(<Avatar initials="GL" />);
    expect(getByText("GL")).toBeTruthy();
  });

  it("renders captain gradient variant", () => {
    const { getByText } = render(<Avatar initials="CP" isCaptain />);
    expect(getByText("CP")).toBeTruthy();
  });

  it("renders image when imageUrl provided", () => {
    const { toJSON } = render(<Avatar imageUrl="https://example.com/img.jpg" />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders all sizes", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
    sizes.forEach((size) => {
      const { toJSON } = render(<Avatar initials="T" size={size} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
