-- CreateTable
CREATE TABLE IF NOT EXISTS "CaseStudy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "assessmentId" TEXT,
    "sectionId" TEXT,
    "title" TEXT NOT NULL,
    "passageText" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseStudy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseStudy_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CaseStudy_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CaseStudy_assessmentId_idx" ON "CaseStudy"("assessmentId");
CREATE INDEX IF NOT EXISTS "CaseStudy_sectionId_idx" ON "CaseStudy"("sectionId");
CREATE INDEX IF NOT EXISTS "CaseStudy_tenantId_idx" ON "CaseStudy"("tenantId");

-- AlterTable
ALTER TABLE "AssessmentItem" ADD COLUMN "caseStudyId" TEXT
    REFERENCES "CaseStudy"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "AssessmentItem_caseStudyId_idx" ON "AssessmentItem"("caseStudyId");

-- AlterTable
ALTER TABLE "AssessmentCompositionItem" ADD COLUMN "sourceCaseStudyId" TEXT
    REFERENCES "CaseStudy"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "AssessmentCompositionItem_sourceCaseStudyId_idx" ON "AssessmentCompositionItem"("sourceCaseStudyId");
