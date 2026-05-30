import type { CSSProperties } from "react";

/** TechGrah portal report — hex only, PDF-safe */
export const reportTheme = {
  primary: "#1f2937",
  secondary: "#4b5563",
  accent: "#1d4ed8",
  accentLight: "#dbeafe",
  correct: "#16a34a",
  incorrect: "#dc2626",
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
