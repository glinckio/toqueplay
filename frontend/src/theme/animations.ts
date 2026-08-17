export const timing = {
  splash: 1800,
  bottomSheet: 400,
  bottomSheetOverlay: 250,
  toggle: 200,
  segmentedTabs: 250,
  otpFocus: 150,
  buttonPress: 100,
  cardHover: 200,
  gpsDot: 1500,
  successCheck: 500,
  pageTransition: 300,
  logoGlow: 2000,
  timerTick: 1000,
  resendCooldown: 60000,
} as const;

export const easing = {
  bottomSheet: [0.32, 0.72, 0.37, 1.08] as const,
  pageTransition: [0.4, 0, 0.2, 1] as const,
} as const;
