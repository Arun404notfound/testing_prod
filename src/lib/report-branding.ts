import { reportTheme, type ReportThemePalette } from "@/components/reports/report-theme";

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export type ReportTenantBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  disclaimerText: string | null;
};

export const DEFAULT_REPORT_DISCLAIMER =
  "This report is generated for demo and evaluation purposes. Scores indicate current assessment performance and should be interpreted with interview outcomes and business context. Psychometric-style scores are not diagnostic.";

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  if (!HEX6.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

/** Mix fg toward bg (0 = all bg, 1 = all fg). Returns #RRGGBB or null. */
export function blendHex(fg: string, bg: string, fgAmount: number): string | null {
  const a = parseHex(fg);
  const b = parseHex(bg);
  if (!a || !b) return null;
  const t = Math.max(0, Math.min(1, fgAmount));
  const r = Math.round(a.r * t + b.r * (1 - t));
  const g = Math.round(a.g * t + b.g * (1 - t));
  const bl = Math.round(a.b * t + b.b * (1 - t));
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function pickColor(value: string | null | undefined, fallback: string): string {
  if (value && HEX6.test(value.trim())) return value.trim();
  return fallback;
}

export function mergeReportTheme(branding: ReportTenantBranding | null): ReportThemePalette {
  const accent = pickColor(branding?.accentColor ?? null, reportTheme.accent);
  const accentLight = blendHex(accent, "#ffffff", 0.12) ?? reportTheme.accentLight;
  return {
    ...reportTheme,
    primary: pickColor(branding?.primaryColor ?? null, reportTheme.primary),
    secondary: pickColor(branding?.secondaryColor ?? null, reportTheme.secondary),
    accent,
    accentLight,
  } as ReportThemePalette;
}

export function resolveDisclaimerText(branding: ReportTenantBranding | null): string {
  const raw = branding?.disclaimerText?.trim();
  if (raw) return raw;
  return DEFAULT_REPORT_DISCLAIMER;
}

/** Platform default logo shown on reports when a tenant hasn't configured its own. */
export const DEFAULT_REPORT_LOGO_URL = "/Logo 1.webp";

export function resolveLogoUrl(branding: ReportTenantBranding | null): string | null {
  const u = branding?.logoUrl?.trim();
  if (!u) return DEFAULT_REPORT_LOGO_URL;
  if (u.startsWith("data:") || u.startsWith("/") || u.startsWith("http://") || u.startsWith("https://")) return u;
  return DEFAULT_REPORT_LOGO_URL;
}

/** Prefer assessment tenant for report branding; fallback to candidate tenant. */
export function tenantRowToBranding(
  row:
    | {
        name: string;
        slug: string;
        logoUrl: string | null;
        primaryColor: string | null;
        secondaryColor: string | null;
        accentColor: string | null;
        disclaimerText: string | null;
      }
    | null
    | undefined,
): ReportTenantBranding {
  if (!row) {
    return {
      name: "Demo Client",
      slug: "default",
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      disclaimerText: null,
    };
  }
  return {
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    disclaimerText: row.disclaimerText,
  };
}
