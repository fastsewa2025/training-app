import { TextStyle } from "react-native";

export const Colors = {
  light: {
    primary: "#FF6B2C",
    primaryLight: "#FF8F5E",
    primaryDark: "#D4501A",
    success: "#2ECC71",
    error: "#E74C3C",
    warning: "#F39C12",
    info: "#3498DB",
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    background: "#F7F6F3",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F3F4F6",
    border: "#E5E7EB",
    shadow: "#000000",
  },
  dark: {
    primary: "#FF7A40",
    primaryLight: "#FF9B6B",
    primaryDark: "#D4501A",
    success: "#27AE60",
    error: "#C0392B",
    warning: "#E67E22",
    info: "#2980B9",
    text: "#F9FAFB",
    textSecondary: "#9CA3AF",
    background: "#111827",
    backgroundDefault: "#1F2937",
    backgroundSecondary: "#374151",
    border: "#374151",
    shadow: "#000000",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

// Worker-optimised typography — nothing below 14px, bold weights for readability
export const Typography: Record<string, TextStyle> = {
  h1: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: "700", lineHeight: 26 },
  h4: { fontSize: 17, fontWeight: "600", lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  small: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: "400", lineHeight: 14 },
};

// Minimum touch target per WCAG 2.5.5 (44×44pt)
export const MIN_TOUCH = 48;
