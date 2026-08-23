/**
 * backfill-programs.ts
 *
 * Wraps every existing AssessmentAssignment (that isn't already wrapped) into a
 * single-module Program, so the Program/ProgramAssignment layer has a row for every
 * assignment ever made — without touching AssessmentAssignment/AssessmentAttempt/
 * AssessmentResult data itself.
 *
 * For each AssessmentAssignment with a null programAssignmentId:
 *   - creates one Program (title = assessment title, compositionType = assessment's
 *     moduleType, tenantId = assessment's tenantId)
 *   - creates one ProgramAssessment (displayOrder 0) linking Program -> Assessment
 *   - creates one ProgramAssignment (fresh accessToken, status mirrored from the
 *     AssessmentAssignment) linking Program -> Candidate
 *   - sets AssessmentAssignment.programAssignmentId to the new ProgramAssignment's id
 *
 * Idempotent: skips any AssessmentAssignment that already has a programAssignmentId,
 * so it's safe to re-run (a second run creates zero new rows).
 *
 * Run: npx tsx prisma/backfill-programs.ts
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

function generateAccessToken() {
  return randomBytes(24).toString("base64url");
}

async function main() {
  const pending = await prisma.assessmentAssignment.findMany({
    where: { programAssignmentId: null },
    include: { assessment: { select: { id: true, title: true, moduleType: true, tenantId: true } } },
  });

  console.log(`Found ${pending.length} assignment(s) without a Program wrapper.`);

  let created = 0;
  for (const assignment of pending) {
    await prisma.$transaction(async (tx) => {
      const program = await tx.program.create({
        data: {
          tenantId: assignment.assessment.tenantId,
          title: assignment.assessment.title,
          compositionType: assignment.assessment.moduleType,
        },
      });

      await tx.programAssessment.create({
        data: {
          programId: program.id,
          assessmentId: assignment.assessment.id,
          displayOrder: 0,
        },
      });

      const programAssignment = await tx.programAssignment.create({
        data: {
          programId: program.id,
          candidateId: assignment.candidateId,
          accessToken: generateAccessToken(),
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          completedAt: assignment.completedAt,
          expiresAt: assignment.expiresAt,
        },
      });

      await tx.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { programAssignmentId: programAssignment.id, programModuleOrder: 0 },
      });

      await tx.auditLog.create({
        data: {
          tenantId: assignment.assessment.tenantId,
          actorType: "SYSTEM",
          actorId: null,
          action: "PROGRAM_BACKFILL",
          entityType: "ProgramAssignment",
          entityId: programAssignment.id,
          message: `Backfilled Program "${program.title}" for AssessmentAssignment ${assignment.id}`,
        },
      });
    });
    created += 1;
  }

  console.log(`Created ${created} Program/ProgramAssessment/ProgramAssignment set(s).`);

  const totalPrograms = await prisma.program.count();
  const totalProgramAssignments = await prisma.programAssignment.count();
  const wrappedAssignments = await prisma.assessmentAssignment.count({
    where: { programAssignmentId: { not: null } },
  });
  console.log(
    `Totals — Program: ${totalPrograms}, ProgramAssignment: ${totalProgramAssignments}, ` +
      `AssessmentAssignment with programAssignmentId set: ${wrappedAssignments}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
