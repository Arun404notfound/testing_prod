"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { appUrl } from "@/lib/app-url";
import { generateAccessToken, sendAssignmentAssignedEmail } from "@/lib/email/assignment-email";
import { attachAssessmentToProgram } from "@/lib/programs";
import type { ModuleType } from "@/generated/prisma/enums";

const MODULE_TYPES: ModuleType[] = ["PSYCHOMETRIC", "TECHNICAL", "SURVEY"];
const MODULE_LABELS: Record<ModuleType, string> = {
  PSYCHOMETRIC: "Psychometric",
  TECHNICAL: "Technical",
  SURVEY: "Survey",
};

async function assertProgram(programId: string) {
  const program = await prisma.program.findFirst({ where: { id: programId }, select: { id: true } });
  if (!program) redirect("/admin/programs");
  return program;
}

function builderPath(programId: string, extra = "") {
  return `/admin/programs/${programId}/builder${extra}`;
}

function revalidateProgram(programId: string) {
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${programId}/builder`);
  revalidatePath("/admin/assessments");
}

export async function updateProgramDetails(programId: string, formData: FormData) {
  await assertProgram(programId);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) redirect(builderPath(programId, "?status=error"));
  await prisma.program.update({ where: { id: programId }, data: { title, description } }).catch(() => {});
  revalidateProgram(programId);
  redirect(builderPath(programId, "?status=success"));
}

export async function deleteProgramById(programId: string) {
  await prisma.program.delete({ where: { id: programId } }).catch(() => {});
  revalidatePath("/admin/programs");
  revalidatePath("/admin/assessments");
  redirect("/admin/programs");
}

/**
 * Validates the Assessment's moduleType against the Program's compositionType
 * and the single-vs-mixed module cap via the shared attachAssessmentToProgram
 * helper (also used by the assessment "create new module" shortcut) — this
 * is the defense-in-depth check, on top of the dropdown already filtering to
 * compatible, not-yet-attached Assessments in the common path.
 */
export async function attachExistingAssessment(programId: string, formData: FormData) {
  await assertProgram(programId);
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!assessmentId) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("Pick an assessment to attach")}`));

  const result = await attachAssessmentToProgram(programId, assessmentId);
  revalidateProgram(programId);
  if (!result.ok) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent(result.error)}`));
  redirect(builderPath(programId, "?status=success"));
}

/**
 * Adds a module by type — one click, no separate naming/creation form. Creates
 * a fresh Assessment scoped to moduleType with a generated title, seeds its
 * default "Main" section (same as the full New Assessment flow), and attaches
 * it to the Program immediately. Redirects straight into that module's own
 * builder so the very next step is adding questions to it.
 */
export async function createAndAttachModule(programId: string, formData: FormData) {
  const program = await prisma.program.findFirst({
    where: { id: programId },
    select: { id: true, title: true, compositionType: true },
  });
  if (!program) redirect("/admin/programs");

  const moduleType = String(formData.get("moduleType") ?? "") as ModuleType;
  if (!MODULE_TYPES.includes(moduleType)) redirect(builderPath(programId, "?status=error&reason=Pick+a+module+type"));
  if (program.compositionType !== "MIXED" && program.compositionType !== moduleType) {
    redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent(`This Program only accepts ${program.compositionType} modules`)}`));
  }

  const existingCount = await prisma.programAssessment.count({ where: { programId } });
  if (program.compositionType !== "MIXED" && existingCount >= 1) {
    redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("This Program already has its one module")}`));
  }

  const tenantId = await getDefaultTenantId();
  const label = MODULE_LABELS[moduleType];

  let created;
  try {
    created = await prisma.assessment.create({
      data: {
        tenantId,
        title: `${program.title} — ${label} Module`,
        description: `${label} module for ${program.title}.`,
        moduleType,
        durationMinutes: 30,
        // Program-attached modules have no separate publish step — see the
        // comment on attachAssessmentToProgram in src/lib/programs.ts.
        lifecycleStatus: "published",
        sections: {
          create: [{ title: "Main", description: "Primary content for this module.", displayOrder: 1 }],
        },
      },
    });
    await prisma.programAssessment.create({
      data: { programId, assessmentId: created.id, displayOrder: existingCount },
    });
  } catch {
    redirect(builderPath(programId, "?status=error"));
  }

  revalidateProgram(programId);
  redirect(`/admin/assessments/${created.id}/builder`);
}

/** Removes only the ProgramAssessment join row — the Assessment itself is never deleted. */
export async function detachAssessment(programId: string, formData: FormData) {
  await assertProgram(programId);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.programAssessment.delete({ where: { id, programId } }).catch(() => {});
  revalidateProgram(programId);
  redirect(builderPath(programId));
}

export async function reorderAssessment(programId: string, formData: FormData) {
  await assertProgram(programId);
  const id = String(formData.get("id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const siblings = await prisma.programAssessment.findMany({ where: { programId }, orderBy: { displayOrder: "asc" } });
  const index = siblings.findIndex((s) => s.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= siblings.length) {
    redirect(builderPath(programId));
  }
  const a = siblings[index];
  const b = siblings[swapWith];
  // A direct two-way swap violates the @@unique([programId, displayOrder])
  // constraint mid-transaction (SQLite checks it per-statement, not at
  // commit) — moving `a` through a scratch value that no real row ever
  // holds (displayOrder is always >= 0) avoids the collision.
  await prisma.$transaction([
    prisma.programAssessment.update({ where: { id: a.id }, data: { displayOrder: -1 } }),
    prisma.programAssessment.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } }),
    prisma.programAssessment.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } }),
  ]);
  revalidateProgram(programId);
  redirect(builderPath(programId));
}

type ProgramWithAssessments = {
  id: string;
  title: string;
  assessments: { displayOrder: number; assessment: { id: string; title: string; lifecycleStatus: string } }[];
};

async function loadAssignableProgram(programId: string): Promise<ProgramWithAssessments | null> {
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

/** Redirects (never returns) unless the Program has ≥1 attached module and every one of them is published. */
function assertAssignable(programId: string, program: ProgramWithAssessments) {
  if (program.assessments.length === 0) {
    redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("Attach at least one module first")}`));
  }
  const unpublished = program.assessments.find((pa) => pa.assessment.lifecycleStatus !== "published");
  if (unpublished) {
    redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent(`"${unpublished.assessment.title}" must be published before assigning this Program`)}`));
  }
}

function parseExpiresAt(formData: FormData): Date | null {
  const raw = String(formData.get("expiresAt") ?? "").trim();
  return raw ? new Date(raw) : null;
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
async function createProgramAssignment(
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

/** Assigns the whole Program to one candidate — one emailed link that walks them through every module in order. */
export async function assignProgramToCandidate(programId: string, formData: FormData) {
  await assertProgram(programId);
  const candidateId = String(formData.get("candidateId") ?? "").trim();
  if (!candidateId) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("Pick a candidate")}`));

  const tenantId = await getDefaultTenantId();
  const [program, candidate] = await Promise.all([
    loadAssignableProgram(programId),
    prisma.candidate.findFirst({ where: { id: candidateId, tenantId }, select: { id: true, fullName: true, email: true } }),
  ]);
  if (!program || !candidate) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("Candidate not found")}`));
  assertAssignable(programId, program);

  const expiresAt = parseExpiresAt(formData);
  let assignment: { programAssignmentId: string; accessToken: string };
  try {
    assignment = await createProgramAssignment(program, candidateId, expiresAt);
  } catch {
    redirect(builderPath(programId, "?status=error"));
  }

  const emailResult = await sendAssignmentAssignedEmail({
    tenantId,
    candidateEmail: candidate.email,
    candidateName: candidate.fullName,
    assessmentTitle: program.title,
    link: appUrl(`/candidate/program/${assignment.programAssignmentId}?token=${assignment.accessToken}`),
    durationMinutes: null,
    expiresAt,
  });

  revalidateProgram(programId);
  redirect(builderPath(programId, `?status=${emailResult.ok ? "assign_success" : "assign_success_email_failed"}`));
}

/**
 * Batch equivalent of assignProgramToCandidate — every candidate across the
 * selected batch(es) gets their own ProgramAssignment (own link, own child
 * module assignments). Candidates who already have an active (non-completed,
 * non-expired) ProgramAssignment for this Program are skipped, mirroring the
 * duplicate-guard the single-assessment batch flow already uses
 * (src/app/admin/assignments/page.tsx's bulkAssignBatch).
 */
export async function assignProgramToBatch(programId: string, formData: FormData) {
  await assertProgram(programId);
  const batchNames = formData.getAll("batchName").map((v) => String(v).trim()).filter(Boolean);
  if (!batchNames.length) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("Select at least one batch")}`));

  const tenantId = await getDefaultTenantId();
  const [program, candidates] = await Promise.all([
    loadAssignableProgram(programId),
    prisma.candidate.findMany({ where: { tenantId, batchName: { in: batchNames } }, select: { id: true, fullName: true, email: true } }),
  ]);
  if (!program) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("Program not found")}`));
  assertAssignable(programId, program);
  if (candidates.length === 0) redirect(builderPath(programId, `?status=error&reason=${encodeURIComponent("No candidates found in that batch")}`));

  const expiresAt = parseExpiresAt(formData);

  let created = 0;
  let emailFailures = 0;
  for (const candidate of candidates) {
    const existing = await prisma.programAssignment.findFirst({
      where: {
        programId,
        candidateId: candidate.id,
        status: "assigned",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (existing) continue;

    let assignment: { programAssignmentId: string; accessToken: string };
    try {
      assignment = await createProgramAssignment(program, candidate.id, expiresAt);
    } catch {
      continue;
    }
    created++;

    const emailResult = await sendAssignmentAssignedEmail({
      tenantId,
      candidateEmail: candidate.email,
      candidateName: candidate.fullName,
      assessmentTitle: program.title,
      link: appUrl(`/candidate/program/${assignment.programAssignmentId}?token=${assignment.accessToken}`),
      durationMinutes: null,
      expiresAt,
    });
    if (!emailResult.ok) emailFailures++;
  }

  revalidateProgram(programId);
  redirect(builderPath(programId, `?status=assign_bulk_success&count=${created}&total=${candidates.length}&emailFailures=${emailFailures}`));
}
