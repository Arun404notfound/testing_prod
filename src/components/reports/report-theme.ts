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

/**
 * Fixed design colors for the client-approved report redesign (cover,
 * section headings, "about this report" page) — deliberately NOT part of
 * `reportTheme`/`useReportTheme()`, which exists specifically so a tenant's
 * own configured brand colors can override the accent/ink used elsewhere in
 * the report. These stay constant across every tenant instead, matching the
 * reference PDF's own literal palette exactly, per explicit direction: the
 * redesigned pages should look identical to the reference regardless of
 * which tenant generated them, not shift with tenant branding config.
 */
export const REPORT_DESIGN_COLORS = {
  ink: "#0F172A",
  body: "#475569",
  accent: "#1D4ED8",
  accentStripe: "#DC2626",
  hairline: "#E2E8F0",
  /** Muted slate-blue used for every small-caps eyebrow label (page-level
   *  "SECTION 0X" and field-level "DESCRIPTION"/"WATCH-OUTS" etc.) — the
   *  reference reserves the saturated `accent` blue for data emphasis
   *  (numbers, bars, links), not for these labels. */
  eyebrow: "#4D6A88",
  /** Lighter, more desaturated variant used only for the domain-name row
   *  above each competency title ("BUILDING THE TEAM"). */
  domainLabel: "#8EA1B4",
  /** Dark red for "Watch-outs" / priority-focus emphasis — distinct from
   *  the amber previously used here, matching the reference exactly. */
  danger: "#9E2A2F",
  /** Neutral (not blue-tinted) light gray used for the cover page's boxed
   *  callout background and border — the reference keeps this box tonally
   *  flat, unlike the blue-tinted boxes used elsewhere pre-redesign. */
  noticeBg: "#F4F4F8",
  noticeBorder: "#C9CDD3",
} as const;

export const pageStyle: CSSProperties = {
  backgroundColor: reportTheme.cardBackground,
  color: reportTheme.ink,
  borderColor: reportTheme.hairline,
  width: "210mm",
  minHeight: "297mm",
  fontFamily: reportTheme.fontFamily,
};
