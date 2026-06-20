import type { CSSProperties } from "react";

/** TechGrah portal report — hex only, PDF-safe */
export const reportTheme = {
  primary: "#0b1d3a",
  secondary: "#0f172a",
  accent: "#2563eb",
  accentLight: "#eff6ff",
  correct: "#10b981",
  incorrect: "#ef4444",
  muted: "#6b7280",
  border: "#e5e7eb",
  pageBackground: "#f3f4f6",
  cardBackground: "#ffffff",
  subtleBackground: "#f9fafb",
} as const;

export type ReportThemePalette = typeof reportTheme;

export const pageStyle: CSSProperties = {
  backgroundColor: reportTheme.cardBackground,
  color: reportTheme.primary,
  borderColor: reportTheme.border,
  width: "210mm",
  minHeight: "297mm",
};
