-- Lets a TriadGroup attach under a CaseStudy as a Triad-type sub-question,
-- parallel to how MCQ/Likert sub-questions already attach via
-- AssessmentItem.caseStudyId. Purely additive — no existing column changes,
-- so no foreign_keys-off table rebuild is needed for this one.

ALTER TABLE "TriadGroup" ADD COLUMN IF NOT EXISTS "caseStudyId" TEXT
    REFERENCES "CaseStudy"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "TriadGroup_caseStudyId_idx" ON "TriadGroup"("caseStudyId");
