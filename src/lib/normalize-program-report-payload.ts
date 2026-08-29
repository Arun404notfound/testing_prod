import { tenantRowToBranding, type ReportTenantBranding } from "./report-branding";
import { normalizeReportPayload } from "./normalize-report-payload";
import type { ProgramReportPayload } from "./program-report-data";

const COMPOSITION_TYPES = new Set<string>(["PSYCHOMETRIC", "TECHNICAL", "SURVEY", "MIXED"]);

/** Hardens the /api/program-reports JSON response the same way normalize-report-payload
 *  does for a single module — lives in a Prisma-free module so client pages can import it. */
export function normalizeProgramReportPayload(data: unknown): ProgramReportPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Partial<ProgramReportPayload> & Record<string, unknown>;
  if (typeof o.programResultId !== "string") return null;

  const modules = Array.isArray(o.modules)
    ? o.modules.map((m) => normalizeReportPayload(m)).filter((m): m is NonNullable<typeof m> => m !== null)
    : [];
  if (modules.length === 0) return null;

  const tbRaw = o.tenantBranding;
  let tenantBranding: ReportTenantBranding;
  if (tbRaw && typeof tbRaw === "object" && !Array.isArray(tbRaw)) {
    const t = tbRaw as Record<string, unknown>;
    tenantBranding = tenantRowToBranding({
      name: typeof t.name === "string" && t.name.trim() ? t.name.trim() : "Demo Client",
      slug: typeof t.slug === "string" && t.slug.trim() ? t.slug.trim() : "default",
      logoUrl: typeof t.logoUrl === "string" || t.logoUrl === null ? (t.logoUrl as string | null) : null,
      primaryColor: typeof t.primaryColor === "string" || t.primaryColor === null ? (t.primaryColor as string | null) : null,
      secondaryColor: typeof t.secondaryColor === "string" || t.secondaryColor === null ? (t.secondaryColor as string | null) : null,
      accentColor: typeof t.accentColor === "string" || t.accentColor === null ? (t.accentColor as string | null) : null,
      disclaimerText: typeof t.disclaimerText === "string" || t.disclaimerText === null ? (t.disclaimerText as string | null) : null,
    });
  } else {
    tenantBranding = tenantRowToBranding(null);
  }

  return {
    programResultId: o.programResultId,
    programTitle: typeof o.programTitle === "string" ? o.programTitle : "Program",
    compositionType: (typeof o.compositionType === "string" && COMPOSITION_TYPES.has(o.compositionType)
      ? o.compositionType
      : "MIXED") as ProgramReportPayload["compositionType"],
    candidateName: typeof o.candidateName === "string" ? o.candidateName : "",
    candidateRole: typeof o.candidateRole === "string" ? o.candidateRole : "",
    tenantName: o.tenantName === null || typeof o.tenantName === "string" ? o.tenantName : null,
    tenantBranding,
    completedAt: typeof o.completedAt === "string" ? o.completedAt : new Date(0).toISOString(),
    modules,
  };
}
