-- AddCompetencyEngine: Attribute, Competency, AttributeCompetencyMap, CompetencyScore
-- Also adds attributeId to AssessmentItem and TriadStatement

-- Attribute master table
CREATE TABLE IF NOT EXISTS "Attribute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attribute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Attribute_tenantId_code_key" ON "Attribute"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "Attribute_tenantId_idx" ON "Attribute"("tenantId");

-- Competency master table
CREATE TABLE IF NOT EXISTS "Competency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportDescription" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Competency_tenantId_name_key" ON "Competency"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Competency_tenantId_idx" ON "Competency"("tenantId");

-- Attribute → Competency mapping with weight
CREATE TABLE IF NOT EXISTS "AttributeCompetencyMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attributeId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttributeCompetencyMap_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttributeCompetencyMap_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AttributeCompetencyMap_attributeId_competencyId_key" ON "AttributeCompetencyMap"("attributeId", "competencyId");
CREATE INDEX IF NOT EXISTS "AttributeCompetencyMap_attributeId_idx" ON "AttributeCompetencyMap"("attributeId");
CREATE INDEX IF NOT EXISTS "AttributeCompetencyMap_competencyId_idx" ON "AttributeCompetencyMap"("competencyId");

-- Competency score per attempt
CREATE TABLE IF NOT EXISTS "CompetencyScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "rawScore" REAL NOT NULL,
    "maxScore" REAL NOT NULL,
    "scaledScore" REAL NOT NULL,
    "percent" REAL NOT NULL,
    "band" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetencyScore_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetencyScore_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetencyScore_attemptId_competencyId_key" ON "CompetencyScore"("attemptId", "competencyId");
CREATE INDEX IF NOT EXISTS "CompetencyScore_attemptId_idx" ON "CompetencyScore"("attemptId");
CREATE INDEX IF NOT EXISTS "CompetencyScore_competencyId_idx" ON "CompetencyScore"("competencyId");

-- Add attributeId to AssessmentItem (optional FK)
ALTER TABLE "AssessmentItem" ADD COLUMN IF NOT EXISTS "attributeId" TEXT
    REFERENCES "Attribute"("id") ON DELETE SET NULL;

-- Add attributeId to TriadStatement (optional FK)
ALTER TABLE "TriadStatement" ADD COLUMN IF NOT EXISTS "attributeId" TEXT
    REFERENCES "Attribute"("id") ON DELETE SET NULL;
