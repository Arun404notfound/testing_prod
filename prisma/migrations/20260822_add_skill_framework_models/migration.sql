-- Skill Framework: full mirror of JobRole/Domain/Competency/AttributeCompetencyMap/
-- CompetencyBandContent/DevelopmentProject, rooted in Skill/SubSkill instead of
-- Attribute, used only by the TECHNICAL module. SubSkill is the measurable leaf
-- (like Attribute); Skill is the loose category (like Attribute.category).
-- Also reworks the already-shipped, zero-row SkillScore to key on
-- skillCompetencyId instead of skillId (exactly parallel to CompetencyScore now),
-- and adds Assessment.skillFrameworkId / ReportTemplate.skillFrameworkId, parallel
-- to their jobRoleId equivalents.
-- Applied via `prisma db push` against the live dev database; this file documents
-- the resulting schema for fresh installs / other environments.

CREATE TABLE "SkillFramework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillFramework_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "SkillFramework_tenantId_idx" ON "SkillFramework"("tenantId");
CREATE UNIQUE INDEX "SkillFramework_tenantId_name_key" ON "SkillFramework"("tenantId", "name");

CREATE TABLE "SkillDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "skillFrameworkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SkillDomain_skillFrameworkId_fkey" FOREIGN KEY ("skillFrameworkId") REFERENCES "SkillFramework" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkillDomain_tenantId_idx" ON "SkillDomain"("tenantId");
CREATE INDEX "SkillDomain_skillFrameworkId_idx" ON "SkillDomain"("skillFrameworkId");
CREATE UNIQUE INDEX "SkillDomain_skillFrameworkId_name_key" ON "SkillDomain"("skillFrameworkId", "name");

CREATE TABLE "SkillCompetency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "skillFrameworkId" TEXT,
    "skillDomainId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportDescription" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "scoringFormula" TEXT NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "proficiencyScale" TEXT NOT NULL DEFAULT 'GENERIC_5',
    "strengthStatement" TEXT,
    "developmentNeedStatement" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillCompetency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SkillCompetency_skillFrameworkId_fkey" FOREIGN KEY ("skillFrameworkId") REFERENCES "SkillFramework" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkillCompetency_skillDomainId_fkey" FOREIGN KEY ("skillDomainId") REFERENCES "SkillDomain" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "SkillCompetency_tenantId_idx" ON "SkillCompetency"("tenantId");
CREATE INDEX "SkillCompetency_skillFrameworkId_idx" ON "SkillCompetency"("skillFrameworkId");
CREATE INDEX "SkillCompetency_skillDomainId_idx" ON "SkillCompetency"("skillDomainId");
CREATE UNIQUE INDEX "SkillCompetency_tenantId_skillFrameworkId_name_key" ON "SkillCompetency"("tenantId", "skillFrameworkId", "name");

CREATE TABLE "SkillCompetencyMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subSkillId" TEXT NOT NULL,
    "skillCompetencyId" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillCompetencyMap_subSkillId_fkey" FOREIGN KEY ("subSkillId") REFERENCES "SubSkill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkillCompetencyMap_skillCompetencyId_fkey" FOREIGN KEY ("skillCompetencyId") REFERENCES "SkillCompetency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkillCompetencyMap_subSkillId_idx" ON "SkillCompetencyMap"("subSkillId");
CREATE INDEX "SkillCompetencyMap_skillCompetencyId_idx" ON "SkillCompetencyMap"("skillCompetencyId");
CREATE UNIQUE INDEX "SkillCompetencyMap_subSkillId_skillCompetencyId_key" ON "SkillCompetencyMap"("subSkillId", "skillCompetencyId");

CREATE TABLE "SkillCompetencyBandContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillCompetencyId" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "proficiencyDescription" TEXT NOT NULL,
    "behaviouralImplications" TEXT NOT NULL,
    "watchOuts" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillCompetencyBandContent_skillCompetencyId_fkey" FOREIGN KEY ("skillCompetencyId") REFERENCES "SkillCompetency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkillCompetencyBandContent_skillCompetencyId_idx" ON "SkillCompetencyBandContent"("skillCompetencyId");
CREATE UNIQUE INDEX "SkillCompetencyBandContent_skillCompetencyId_band_key" ON "SkillCompetencyBandContent"("skillCompetencyId", "band");

CREATE TABLE "SkillDevelopmentProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillCompetencyId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "whatToDo" TEXT NOT NULL,
    "howToDoIt" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillDevelopmentProject_skillCompetencyId_fkey" FOREIGN KEY ("skillCompetencyId") REFERENCES "SkillCompetency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkillDevelopmentProject_skillCompetencyId_idx" ON "SkillDevelopmentProject"("skillCompetencyId");

-- SkillScore rework: skillId -> skillCompetencyId, + band. Zero rows existed, so
-- this is a straight column-set replacement rather than a data-preserving rebuild.
DROP TABLE "SkillScore";
CREATE TABLE "SkillScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "skillCompetencyId" TEXT NOT NULL,
    "rawScore" REAL NOT NULL,
    "maxScore" REAL NOT NULL,
    "scaledScore" REAL NOT NULL,
    "percent" REAL NOT NULL,
    "band" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillScore_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkillScore_skillCompetencyId_fkey" FOREIGN KEY ("skillCompetencyId") REFERENCES "SkillCompetency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkillScore_attemptId_idx" ON "SkillScore"("attemptId");
CREATE INDEX "SkillScore_skillCompetencyId_idx" ON "SkillScore"("skillCompetencyId");
CREATE UNIQUE INDEX "SkillScore_attemptId_skillCompetencyId_key" ON "SkillScore"("attemptId", "skillCompetencyId");

-- Assessment.skillFrameworkId — parallel to jobRoleId, used when moduleType = TECHNICAL.
ALTER TABLE "Assessment" ADD COLUMN "skillFrameworkId" TEXT REFERENCES "SkillFramework" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Assessment_skillFrameworkId_idx" ON "Assessment"("skillFrameworkId");

-- ReportTemplate.skillFrameworkId — parallel to jobRoleId, a SkillFramework can own one dedicated template.
ALTER TABLE "ReportTemplate" ADD COLUMN "skillFrameworkId" TEXT REFERENCES "SkillFramework" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ReportTemplate_skillFrameworkId_key" ON "ReportTemplate"("skillFrameworkId");
