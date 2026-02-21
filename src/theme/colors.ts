// theme/colors.ts - App icon aligned palette

export const Colors = {
  // Brand (aligned with AppIcons + adaptive icon background)
  primary: "#1F5E8C",
  primaryLight: "#4A87B5",
  primaryDark: "#184A6D",

  // Secondary accent
  secondary: "#2E8B57",

  // Semantic
  success: "#2E9D5B",
  warning: "#E69A24",
  error: "#D64545",
  info: "#2F7CC0",

  // Text
  text: "#1C2733",
  textPrimary: "#1C2733",
  textSecondary: "#5C6B7A",
  textTertiary: "#8A97A4",
  textInverse: "#FFFFFF",

  // Background
  background: "#F5FAFF",
  surface: "#FFFFFF",
  surfaceLight: "#FFFFFF",
  surfaceDark: "#EAF2FA",

  shadow: "#0F2A4026",

  // Border
  border: "#D4E2F0",
  borderLight: "#E7EEF6",

  // UI States
  disabled: "#AEBECD",
  overlay: "rgba(12, 26, 39, 0.5)",

  // Basic
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",

  // Chart colors (for dashboard)
  chart1: "#1F5E8C",
  chart2: "#2E9D5B",
  chart3: "#E69A24",
  chart4: "#6B5CA5",
} as const;
