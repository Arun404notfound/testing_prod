import type { CSSProperties } from "react";

/**
 * Premium report theme — hex only (a leftover constraint from the old
 * html2canvas PDF pipeline; no longer required now that the PDF is printed
 * from the real DOM in headless Chrome, but left as-is since it renders correctly).
 *
 * The printed page is always pure white with bold ink typography and one
 * strong solid accent color — no grey card washes, no boxed borders around
 * content. `pageBackground` is the exception: it's the app chrome *behind*
 * the page in the on-screen viewer, never part of the exported PDF.
 */
export const reportTheme = {
  // Primary tokens — used by every actively-rendered report component.
  ink: "#0B0F14",
  body: "#1F2937",
  accent: "#0F766E",
  accentContrastText: "#ffffff",
  /** Unfilled segment of a score bar — the only sanctioned light-grey use. */
  trackBackground: "#E7E9EC",
  /** Thin structural rule (header/footer dividers only, never a box outline). */
  hairline: "#D8DBDF",
  correct: "#10b981",
  incorrect: "#ef4444",
  /** Base font for the report pages — must resolve to the self-hosted Inter
   *  loaded in layout.tsx (--font-inter), not a bare "Inter" name, or a
   *  browser/headless-Chromium without Inter installed as a system font
   *  silently substitutes something else instead of failing loudly. */
  fontFamily: "var(--font-inter), system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",

  // Legacy aliases — kept only so older, currently-unrendered report
  // components (TraitScoresPage, SummaryPage, etc.) still type-check.
  // New/active components should use the tokens above instead.
  primary: "#0B0F14",
  secondary: "#1F2937",
  muted: "#4B5563",
  border: "#D8DBDF",
  accentLight: "#E7E9EC",
  pageBackground: "#F4F5F7",
  cardBackground: "#ffffff",
  subtleBackground: "#ffffff",
} as const;

export type ReportThemePalette = typeof reportTheme;

export const pageStyle: CSSProperties = {
  backgroundColor: reportTheme.cardBackground,
  color: reportTheme.ink,
  borderColor: reportTheme.hairline,
  width: "210mm",
  minHeight: "297mm",
  fontFamily: reportTheme.fontFamily,
};
