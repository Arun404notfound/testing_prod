import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import type { SessionPayload } from "@/lib/auth/session";
import { getReportPayload, type ReportPayload } from "@/lib/report-data";
import { getProgramReportPayload, type ProgramReportPayload } from "@/lib/program-report-data";

/**
 * Shared admin/candidate branching used by both the JSON report API and the
 * server-rendered print view, so the two never drift on who can see what.
 */
export async function getReportPayloadForAccess(
  resultId: string,
  { session, token }: { session: SessionPayload | null; token?: string | null },
): Promise<ReportPayload | null> {
  if (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN") {
    return getReportPayload(resultId, { kind: "portal", portalTenantId: await getDefaultTenantId() });
  }
  const result = await prisma.assessmentResult.findUnique({ where: { id: resultId }, select: { candidateId: true } });
  return result ? getReportPayload(resultId, { kind: "candidate", candidateId: result.candidateId }) : null;
}

/** Same admin/candidate branching, one level up, for the combined Program report. */
export async function getProgramReportPayloadForAccess(
  programResultId: string,
  { session, token }: { session: SessionPayload | null; token?: string | null },
): Promise<ProgramReportPayload | null> {
  if (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN") {
    return getProgramReportPayload(programResultId, { kind: "portal", portalTenantId: await getDefaultTenantId() });
  }
  const result = await prisma.programResult.findUnique({ where: { id: programResultId }, select: { candidateId: true } });
  return result ? getProgramReportPayload(programResultId, { kind: "candidate", candidateId: result.candidateId }) : null;
}
