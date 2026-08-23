-- Module = Assessment.moduleType, backfilled to PSYCHOMETRIC for every existing row.
-- Skill/SubSkill/SkillScore are new, parallel to Attribute/Competency/CompetencyScore,
-- used only by TECHNICAL/SURVEY items — Attribute/Competency stay untouched.
-- Applied via `prisma db push` against the live dev database; this file documents the
-- resulting schema for fresh installs / other environments (same convention as
-- 20260707_remove_password_auth_add_access_token).

-- New tables must exist before AssessmentItem's skillId/subSkillId FK columns below.
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Skill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Skill_tenantId_idx" ON "Skill"("tenantId");
CREATE UNIQUE INDEX "Skill_tenantId_name_key" ON "Skill"("tenantId", "name");

CREATE TABLE "SubSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SubSkill_skillId_idx" ON "SubSkill"("skillId");
CREATE UNIQUE INDEX "SubSkill_skillId_name_key" ON "SubSkill"("skillId", "name");

CREATE TABLE "SkillScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "rawScore" REAL NOT NULL,
    "maxScore" REAL NOT NULL,
    "scaledScore" REAL NOT NULL,
    "percent" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillScore_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkillScore_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkillScore_attemptId_idx" ON "SkillScore"("attemptId");
CREATE INDEX "SkillScore_skillId_idx" ON "SkillScore"("skillId");
CREATE UNIQUE INDEX "SkillScore_attemptId_skillId_key" ON "SkillScore"("attemptId", "skillId");

-- Assessment.moduleType — every existing row backfills to PSYCHOMETRIC via the column default.
ALTER TABLE "Assessment" ADD COLUMN "moduleType" TEXT NOT NULL DEFAULT 'PSYCHOMETRIC';
CREATE INDEX "Assessment_moduleType_idx" ON "Assessment"("moduleType");

-- AssessmentItem — weightage (default equal weight), Skill/SubSkill tagging, media.
-- attributeId is untouched; skillId/subSkillId are independent, nullable, and used
-- only by TECHNICAL/SURVEY items.
ALTER TABLE "AssessmentItem" ADD COLUMN "weightage" REAL NOT NULL DEFAULT 1;
ALTER TABLE "AssessmentItem" ADD COLUMN "skillId" TEXT REFERENCES "Skill" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentItem" ADD COLUMN "subSkillId" TEXT REFERENCES "SubSkill" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentItem" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "AssessmentItem" ADD COLUMN "audioUrl" TEXT;
CREATE INDEX "AssessmentItem_skillId_idx" ON "AssessmentItem"("skillId");
CREATE INDEX "AssessmentItem_subSkillId_idx" ON "AssessmentItem"("subSkillId");

-- ItemOption — option-level image (e.g. image-based MCQ choices).
ALTER TABLE "ItemOption" ADD COLUMN "imageUrl" TEXT;

-- ItemType gains OPEN_ENDED. SQLite stores this column as plain TEXT with no CHECK
-- constraint, so no DDL is needed for the new enum value itself.
