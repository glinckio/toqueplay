import { brand, dark, light, semantic, avatarPoolDark, avatarPoolLight, getThemeColors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { shadowsDark, shadowsLight } from "@/theme/shadows";
import { timing, easing } from "@/theme/animations";

describe("Design Tokens", () => {
  describe("Colors", () => {
    it("brand palette has required keys", () => {
      expect(brand.primary).toBe("#7C3AED");
      expect(brand.accentLime).toBe("#C6F82A");
      expect(brand.purpleDeep).toBe("#2D1B69");
    });

    it("dark palette has bg + text + border + accent", () => {
      expect(dark.bg.base).toBe("#0C0A12");
      expect(dark.bg.card).toBe("#141019");
      expect(dark.text.primary).toBe("#F5F3FA");
      expect(dark.border.card).toBe("rgba(255,255,255,0.06)");
      expect(dark.accent.active).toBe("#C6F82A");
    });

    it("light palette has bg + text + border + accent", () => {
      expect(light.bg.base).toBe("#F6F4FC");
      expect(light.bg.card).toBe("#FFFFFF");
      expect(light.text.primary).toBe("#1A1030");
      expect(light.accent.active).toBe("#7C3AED");
    });

    it("semantic colors defined", () => {
      expect(semantic.success).toBe("#34D399");
      expect(semantic.warning).toBe("#FBBF24");
      expect(semantic.error).toBe("#EF4444");
    });

    it("avatar pools have entries", () => {
      expect(avatarPoolDark.length).toBe(5);
      expect(avatarPoolLight.length).toBe(3);
      avatarPoolDark.forEach((p) => {
        expect(p).toHaveProperty("bg");
        expect(p).toHaveProperty("text");
      });
    });

    it("getThemeColors returns dark palette", () => {
      const c = getThemeColors("dark");
      expect(c.bg.base).toBe("#0C0A12");
      expect(c.text.primary).toBe("#F5F3FA");
    });

    it("getThemeColors returns light palette", () => {
      const c = getThemeColors("light");
      expect(c.bg.base).toBe("#F6F4FC");
      expect(c.text.primary).toBe("#1A1030");
    });
  });

  describe("Typography", () => {
    it("display preset correct", () => {
      expect(typography.display.fontFamily).toBe("SpaceGrotesk_700Bold");
      expect(typography.display.fontSize).toBe(36);
    });

    it("body preset correct", () => {
      expect(typography.body.fontFamily).toBe("Manrope_400Regular");
      expect(typography.body.fontSize).toBe(13.5);
    });

    it("all presets have fontFamily and fontSize", () => {
      Object.values(typography).forEach((preset) => {
        expect(preset.fontFamily).toBeTruthy();
        expect(typeof preset.fontSize).toBe("number");
      });
    });
  });

  describe("Shadows", () => {
    it("dark shadows are empty ViewStyle objects", () => {
      expect(shadowsDark.none).toEqual({});
      expect(shadowsDark.sm).toEqual({});
    });

    it("light shadows have elevation", () => {
      expect(shadowsLight.sm.elevation).toBe(2);
      expect(shadowsLight.md.elevation).toBe(4);
      expect(shadowsLight.purpleGlow.shadowColor).toBe("#7C3AED");
    });
  });

  describe("Animations", () => {
    it("timing constants defined", () => {
      expect(timing.splash).toBe(1800);
      expect(timing.buttonPress).toBe(100);
      expect(timing.bottomSheet).toBe(400);
    });

    it("easing curves are arrays of 4 numbers", () => {
      expect(easing.bottomSheet).toHaveLength(4);
      expect(easing.pageTransition).toHaveLength(4);
    });
  });
});
