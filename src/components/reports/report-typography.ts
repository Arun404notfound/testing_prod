export const reportTypography = {
  fontFamily: "var(--font-inter), system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",

  // Heading scale - consistent across all report pages
  h1: { fontSize: "1.875rem", lineHeight: "1.1", fontWeight: 800 },     // 30px - Main page title
  h2: { fontSize: "1.25rem", lineHeight: "1.2", fontWeight: 700 },       // 20px - Section heading
  h3: { fontSize: "0.875rem", lineHeight: "1.3", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }, // 14px - Subsection label
  h4: { fontSize: "0.75rem", lineHeight: "1.3", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }, // 12px - Small label

  // Body text scale
  body: { fontSize: "1rem", lineHeight: "1.6", fontWeight: 400 },         // 16px - Primary body text
  bodySmall: { fontSize: "0.875rem", lineHeight: "1.5", fontWeight: 400 }, // 14px - Secondary body text
  bodyXSmall: { fontSize: "0.75rem", lineHeight: "1.5", fontWeight: 400 }, // 12px - Fine print

  // Data display
  dataLarge: { fontSize: "2rem", lineHeight: "1", fontWeight: 700 },      // 32px - Large scores
  dataMedium: { fontSize: "1.125rem", lineHeight: "1.2", fontWeight: 700 }, // 18px - Medium scores
  dataSmall: { fontSize: "0.875rem", lineHeight: "1.2", fontWeight: 600 }, // 14px - Small scores

  // Table
  tableHeader: { fontSize: "0.75rem", lineHeight: "1.3", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  tableCell: { fontSize: "0.875rem", lineHeight: "1.5", fontWeight: 400 },
  tableCellBold: { fontSize: "0.875rem", lineHeight: "1.5", fontWeight: 700 },

  // Badge/label
  badge: { fontSize: "0.625rem", lineHeight: "1", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }, // 10px
} as const;

export type ReportTypography = typeof reportTypography;