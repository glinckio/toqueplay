import { ViewStyle } from "react-native";

export const shadowsDark = {
  none: {} as ViewStyle,
  sm: {} as ViewStyle,
  md: {} as ViewStyle,
  deeper: {} as ViewStyle,
  lg: {} as ViewStyle,
  purpleGlow: {} as ViewStyle,
  purpleGlowSm: {} as ViewStyle,
} as const;

export const shadowsLight = {
  sm: {
    shadowColor: "rgba(46,16,101,1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: "rgba(46,16,101,1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
  deeper: {
    shadowColor: "rgba(46,16,101,1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
  lg: {
    shadowColor: "rgba(46,16,101,1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
  purpleGlow: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,
  purpleGlowSm: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
} as const;
