import { prisma } from "@/lib/prisma";

export type AttachAssessmentResult = { ok: true } | { ok: false; error: string };

/**
 * Attaches an Assessment to a Program as one of its modules. Validates the
 * Assessment's moduleType against the Program's compositionType (exact match
 * for single-type Programs, any of the three for MIXED) and enforces that a
 * single-type Program has exactly one attached module. Called both from the
 * "attach existing Assessment" Program Builder action and from the
 * "create new module" shortcut on the Assessment create form — both paths
 * must go through this one check, since neither can be trusted to have
 * filtered correctly on its own.
 */
export async function attachAssessmentToProgram(programId: string, assessmentId: string): Promise<AttachAssessmentResult> {
  const [program, assessment] = await Promise.all([
    prisma.program.findFirst({
      where: { id: programId },
      select: { id: true, compositionType: true, assessments: { select: { id: true } } },
    }),
    prisma.assessment.findFirst({ where: { id: assessmentId }, select: { id: true, moduleType: true } }),
  ]);
  if (!program) return { ok: false, error: "Program not found" };
  if (!assessment) return { ok: false, error: "Assessment not found" };

  const alreadyAttached = program.assessments.some((a) => a.id === assessmentId);
  if (alreadyAttached) return { ok: false, error: "This module is already attached to the Program" };

  if (program.compositionType !== "MIXED" && assessment.moduleType !== program.compositionType) {
    return { ok: false, error: `This Program only accepts ${program.compositionType} modules` };
  }
  if (program.compositionType !== "MIXED" && program.assessments.length >= 1) {
    return { ok: false, error: "This Program already has its one module — switch to Mixed to add more" };
  }

  // A module attached to a Program is assigned as part of that Program, not
  // individually — so it no longer goes through its own separate draft/publish
  // step. Auto-publishing here (and at module-creation time, see
  // createAndAttachModule) is what makes the Program's "Assign to a candidate"
  // gate satisfiable without a per-module publish action anywhere in the UI.
  await prisma.$transaction([
    prisma.programAssessment.create({
      data: { programId, assessmentId, displayOrder: program.assessments.length },
    }),
    prisma.assessment.update({ where: { id: assessmentId }, data: { lifecycleStatus: "published" } }),
  ]);
  return { ok: true };
}
