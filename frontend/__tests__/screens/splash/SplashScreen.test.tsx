import React from "react";
import { render } from "@testing-library/react-native";
import { SplashScreen } from "@/screens/splash/SplashScreen";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      text: { primary: "#F5F3FA", secondary: "#CFC8E0", tertiary: "#A9A2BC", muted: "#948CA8", disabled: "#6E6684" },
    },
    brand: { primary: "#7C3AED", accentLime: "#C6F82A" },
    shadows: { none: {}, sm: {}, md: {}, deeper: {}, lg: {}, purpleGlow: {}, purpleGlowSm: {} },
    semantic: {},
    toggle: jest.fn(),
  }),
}));

describe("SplashScreen", () => {
  it("renders app name and tagline", () => {
    const { getByText } = render(<SplashScreen />);
    expect(getByText("ToquePlay")).toBeTruthy();
    expect(getByText("Vôlei na palma da mão")).toBeTruthy();
  });

  it("renders logo image", () => {
    const { UNSAFE_root } = render(<SplashScreen />);
    const images = UNSAFE_root.findAllByType(require("react-native").Image);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it("renders version number", () => {
    const { getByText } = render(<SplashScreen />);
    expect(getByText("v2.4.0")).toBeTruthy();
  });
});
