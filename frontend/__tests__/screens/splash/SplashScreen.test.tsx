import React from "react";
import { render } from "@testing-library/react-native";
import { SplashScreen } from "@/screens/splash/SplashScreen";

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
