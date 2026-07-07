-- Remove candidate password-auth system; add per-assignment access tokens for link-based access.
-- Applied by hand against the dev database (broken shadow-db history predates this change);
-- this file documents the resulting schema for fresh installs / other environments.

PRAGMA foreign_keys=OFF;

-- Drop candidate password-reset/setup token tables (auth artifacts of the removed system)
DROP TABLE IF EXISTS "PasswordToken";
DROP TABLE IF EXISTS "PasswordResetRequest";

-- Recreate Candidate without the userId login link (candidates no longer have a User row)
CREATE TABLE "Candidate_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "batchName" TEXT,
    CONSTRAINT "Candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "Candidate_new" SELECT "id", "tenantId", "fullName", "email", "mobile", "employeeId", "designation", "department", "location", "createdAt", "updatedAt", "batchName" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "Candidate_new" RENAME TO "Candidate";
CREATE INDEX "Candidate_tenantId_idx" ON "Candidate"("tenantId");
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");
CREATE INDEX "Candidate_employeeId_idx" ON "Candidate"("employeeId");
CREATE INDEX "Candidate_batchName_idx" ON "Candidate"("batchName");

-- Recreate AssessmentAssignment with a required, unique accessToken (link-based candidate access)
CREATE TABLE "AssessmentAssignment_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER,
    "expiresAt" DATETIME,
    "maxAttempts" INTEGER,
    CONSTRAINT "AssessmentAssignment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "AssessmentAssignment_new" SELECT "id", "candidateId", "assessmentId", lower(hex(randomblob(16))), "status", "assignedAt", "completedAt", "createdAt", "updatedAt", "durationMinutes", "expiresAt", "maxAttempts" FROM "AssessmentAssignment";
DROP TABLE "AssessmentAssignment";
ALTER TABLE "AssessmentAssignment_new" RENAME TO "AssessmentAssignment";
CREATE UNIQUE INDEX "AssessmentAssignment_accessToken_key" ON "AssessmentAssignment"("accessToken");
CREATE INDEX "AssessmentAssignment_candidateId_idx" ON "AssessmentAssignment"("candidateId");
CREATE INDEX "AssessmentAssignment_assessmentId_idx" ON "AssessmentAssignment"("assessmentId");
CREATE INDEX "AssessmentAssignment_status_idx" ON "AssessmentAssignment"("status");
CREATE INDEX "AssessmentAssignment_assignedAt_idx" ON "AssessmentAssignment"("assignedAt");

-- Remove candidate-role login users (auth artifacts); admins are untouched
DELETE FROM "User" WHERE "role" = 'CANDIDATE';

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
