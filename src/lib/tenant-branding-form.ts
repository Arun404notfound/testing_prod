/** Defaults for tenant branding forms (create + edit fallbacks). */
export const TENANT_BRANDING_FORM_DEFAULTS = {
  primary: "#2563EB",
  secondary: "#2563EB",
  accent: "#34D399",
} as const;

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function normalizeTenantHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const withHash = s.startsWith("#") ? s : `#${s}`;
  return HEX6.test(withHash) ? withHash : null;
}

export function resolveTenantFormColor(
  raw: unknown,
  role: keyof typeof TENANT_BRANDING_FORM_DEFAULTS
): string {
  return normalizeTenantHex(raw) ?? TENANT_BRANDING_FORM_DEFAULTS[role];
}
