import { prisma } from "@/lib/prisma";
import { getReportPayload, type ReportAccess, type ReportPayload } from "@/lib/report-data";
import type { ReportTenantBranding } from "@/lib/report-branding";
import type { ProgramCompositionType } from "@/generated/prisma/enums";

export type ProgramReportPayload = {
  programResultId: string;
  programTitle: string;
  compositionType: ProgramCompositionType;
  candidateName: string;
  candidateRole: string;
  tenantName: string | null;
  tenantBranding: ReportTenantBranding;
  completedAt: string;
  modules: ReportPayload[];
};

/**
 * Combined report for a whole Program — walks every sibling `AssessmentResult`
 * rolled up under one `ProgramResult` (created once every module is scored,
 * see score-and-save.ts) and reuses `getReportPayload` per module so scoring/
 * branding logic never duplicates between the single-module and Program paths.
 */
export async function getProgramReportPayload(
  programResultId: string,
  access?: ReportAccess,
): Promise<ProgramReportPayload | null> {
  const programResult = await prisma.programResult.findUnique({
    where: { id: programResultId },
    include: {
      programAssignment: { include: { program: true } },
      candidate: { select: { tenantId: true } },
      assessmentResults: {
        select: { id: true, assignment: { select: { programModuleOrder: true } } },
      },
    },
  });
  if (!programResult) return null;

  if (access?.kind === "candidate" && programResult.candidateId !== access.candidateId) return null;
  if (access?.kind === "portal" && programResult.candidate.tenantId !== access.portalTenantId) return null;

  const orderedResultIds = [...programResult.assessmentResults]
    .sort((a, b) => (a.assignment?.programModuleOrder ?? 0) - (b.assignment?.programModuleOrder ?? 0))
    .map((r) => r.id);

  const modules: ReportPayload[] = [];
  for (const resultId of orderedResultIds) {
    const payload = await getReportPayload(resultId, access);
    if (payload) modules.push(payload);
  }
  if (modules.length === 0) return null;

  const first = modules[0];

  return {
    programResultId,
    programTitle: programResult.programAssignment.program.title,
    compositionType: programResult.programAssignment.program.compositionType,
    candidateName: first.candidateName,
    candidateRole: first.candidateRole,
    tenantName: first.tenantName,
    tenantBranding: first.tenantBranding,
    completedAt: programResult.completedAt.toISOString(),
    modules,
  };
}
