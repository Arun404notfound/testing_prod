-- Program is a reusable definition (sibling to Assessment); ProgramAssignment is the
-- candidate-facing instance that owns the one emailed accessToken for a Program run
-- (sibling to AssessmentAssignment). AssessmentAssignment/AssessmentAttempt/
-- AssessmentResult keep meaning exactly what they mean today — these tables only wrap
-- them. programAssignmentId/programResultId are nullable and null for every existing
-- row and every future direct/legacy assignment: zero behavior change.
-- Applied via `prisma db push` against the live dev database; this file documents the
-- resulting schema for fresh installs / other environments.

CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "compositionType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Program_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Program_tenantId_idx" ON "Program"("tenantId");
CREATE INDEX "Program_compositionType_idx" ON "Program"("compositionType");

CREATE TABLE "ProgramAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramAssessment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramAssessment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProgramAssessment_assessmentId_idx" ON "ProgramAssessment"("assessmentId");
CREATE UNIQUE INDEX "ProgramAssessment_programId_assessmentId_key" ON "ProgramAssessment"("programId", "assessmentId");
CREATE UNIQUE INDEX "ProgramAssessment_programId_displayOrder_key" ON "ProgramAssessment"("programId", "displayOrder");

CREATE TABLE "ProgramAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramAssignment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProgramAssignment_accessToken_key" ON "ProgramAssignment"("accessToken");
CREATE INDEX "ProgramAssignment_programId_idx" ON "ProgramAssignment"("programId");
CREATE INDEX "ProgramAssignment_candidateId_idx" ON "ProgramAssignment"("candidateId");
CREATE INDEX "ProgramAssignment_status_idx" ON "ProgramAssignment"("status");

CREATE TABLE "ProgramResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programAssignmentId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramResult_programAssignmentId_fkey" FOREIGN KEY ("programAssignmentId") REFERENCES "ProgramAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProgramResult_programAssignmentId_key" ON "ProgramResult"("programAssignmentId");
CREATE INDEX "ProgramResult_candidateId_idx" ON "ProgramResult"("candidateId");

-- AssessmentAssignment — null programAssignmentId/programModuleOrder = direct/legacy
-- assignment, unchanged behavior. Set only when this assignment is one module of a Program.
ALTER TABLE "AssessmentAssignment" ADD COLUMN "programAssignmentId" TEXT REFERENCES "ProgramAssignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentAssignment" ADD COLUMN "programModuleOrder" INTEGER;
CREATE INDEX "AssessmentAssignment_programAssignmentId_idx" ON "AssessmentAssignment"("programAssignmentId");

-- AssessmentResult — set once every module in the Program has been scored.
ALTER TABLE "AssessmentResult" ADD COLUMN "programResultId" TEXT REFERENCES "ProgramResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AssessmentResult_programResultId_idx" ON "AssessmentResult"("programResultId");
