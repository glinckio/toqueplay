import React from "react";
import { render } from "@testing-library/react-native";
import { SplashScreen } from "@/screens/splash/SplashScreen";

/**
 * A splash foi enxugada: hoje é só o logo animado e a barra de progresso. O nome escrito e o
 * número de versão saíram (versão fixa em teste quebraria a cada release de qualquer forma).
 *
 * Nota: o componente ainda declara a prop `subtitle` com um valor padrão, mas não a renderiza
 * em lugar nenhum — prop morta, não coberta aqui de propósito.
 */
describe("SplashScreen", () => {
  it("renders the logo image", () => {
    const { UNSAFE_root } = render(<SplashScreen />);
    const images = UNSAFE_root.findAllByType(require("react-native").Image);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it("renders without crashing at partial progress", () => {
    expect(() => render(<SplashScreen progress={0.4} />)).not.toThrow();
  });
});
