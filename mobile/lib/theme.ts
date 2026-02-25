// Dark-first color palette matching the web frontend
export const colors = {
  background: "#0a0a0a",
  surface: "#111111",
  surfaceElevated: "#1a1a1a",
  border: "#2a2a2a",
  borderMuted: "#1f1f1f",

  text: "#fafafa",
  textMuted: "#a1a1aa",
  textSubtle: "#71717a",

  primary: "#e4e4e7",
  primaryForeground: "#09090b",

  accent: "#27272a",
  accentForeground: "#fafafa",

  destructive: "#7f1d1d",
  destructiveForeground: "#fca5a5",

  success: "#166534",
  successForeground: "#86efac",

  warning: "#92400e",
  warningForeground: "#fde68a",

  // Data source badge colors
  badgeMfr: "#1e3a5f",
  badgeMfrText: "#93c5fd",
  badgeApi: "#14532d",
  badgeApiText: "#86efac",
  badgeUser: "#451a03",
  badgeUserText: "#fde68a",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
};

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
