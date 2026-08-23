-- Rebuild AssessmentAttempt's unique constraint from (assignmentId, attemptNo) to
-- (assignmentId, assessmentId, attemptNo). No-op for every existing row today — a given
-- assignmentId never changes its assessmentId — done now, while cheap, to remove a
-- footgun before any Program ever spans multiple assessments.
-- Applied via `prisma db push` against the live dev database; this file documents the
-- resulting schema for fresh installs / other environments (same rebuild pattern as
-- 20260707_remove_password_auth_add_access_token).

PRAGMA foreign_keys=OFF;

CREATE TABLE "AssessmentAttempt_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT,
    "candidateId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "startedAt" DATETIME,
    "submittedAt" DATETIME,
    "scoredAt" DATETIME,
    "proctoringCameraGranted" BOOLEAN NOT NULL DEFAULT true,
    "proctoringSnapshot" TEXT,
    "trustScore" INTEGER,
    "progressData" JSONB,
    "submissionType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssessmentAttempt_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "AssessmentAttempt_new" SELECT
    "id", "assignmentId", "candidateId", "assessmentId", "status", "attemptNo",
    "startedAt", "submittedAt", "scoredAt", "proctoringCameraGranted", "proctoringSnapshot",
    "trustScore", "progressData", "submissionType", "createdAt", "updatedAt"
FROM "AssessmentAttempt";
DROP TABLE "AssessmentAttempt";
ALTER TABLE "AssessmentAttempt_new" RENAME TO "AssessmentAttempt";

CREATE INDEX "AssessmentAttempt_candidateId_idx" ON "AssessmentAttempt"("candidateId");
CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");
CREATE INDEX "AssessmentAttempt_status_idx" ON "AssessmentAttempt"("status");
CREATE UNIQUE INDEX "AssessmentAttempt_assignmentId_assessmentId_attemptNo_key" ON "AssessmentAttempt"("assignmentId", "assessmentId", "attemptNo");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
