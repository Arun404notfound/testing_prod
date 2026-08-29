import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/email/assignment-email";

export type ProgramWithAssessments = {
  id: string;
  title: string;
  assessments: { displayOrder: number; assessment: { id: string; title: string; lifecycleStatus: string } }[];
};

export async function loadAssignableProgram(programId: string): Promise<ProgramWithAssessments | null> {
  return prisma.program.findFirst({
    where: { id: programId },
    include: {
      assessments: {
        orderBy: { displayOrder: "asc" },
        include: { assessment: { select: { id: true, title: true, lifecycleStatus: true } } },
      },
    },
  });
}

/** Null when the Program can be assigned; otherwise a human-readable reason it can't (no redirect — caller decides). */
export function checkAssignabilityReason(program: ProgramWithAssessments): string | null {
  if (program.assessments.length === 0) return "Attach at least one module first";
  const unpublished = program.assessments.find((pa) => pa.assessment.lifecycleStatus !== "published");
  if (unpublished) return `"${unpublished.assessment.title}" must be published before assigning this Program`;
  return null;
}

/**
 * Creates one ProgramAssignment (the single emailed link) plus one child
 * AssessmentAssignment per attached module, each with its own accessToken so
 * the existing, unchanged /candidate/test/[assignmentId] flow keeps working
 * per module. `expiresAt`, when set, is applied to every child module —
 * that's the field the candidate-side page actually checks (ProgramAssignment
 * itself has no expiry gate today), so a Program-level deadline has to be
 * pushed down to each module to actually lock the candidate out.
 */
export async function createProgramAssignmentRecord(
  program: ProgramWithAssessments,
  candidateId: string,
  expiresAt: Date | null,
): Promise<{ programAssignmentId: string; accessToken: string }> {
  const accessToken = generateAccessToken();
  const programAssignmentId = await prisma.$transaction(async (tx) => {
    const programAssignment = await tx.programAssignment.create({
      data: { programId: program.id, candidateId, accessToken, status: "assigned", expiresAt },
    });
    for (const pa of program.assessments) {
      await tx.assessmentAssignment.create({
        data: {
          candidateId,
          assessmentId: pa.assessment.id,
          accessToken: generateAccessToken(),
          status: "assigned",
          expiresAt,
          programAssignmentId: programAssignment.id,
          programModuleOrder: pa.displayOrder,
        },
      });
    }
    return programAssignment.id;
  });
  return { programAssignmentId, accessToken };
}
