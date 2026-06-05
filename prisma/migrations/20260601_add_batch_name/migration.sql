-- Add batchName to Candidate and ImportJob for batch-based bulk assignment

ALTER TABLE "Candidate" ADD COLUMN "batchName" TEXT;
CREATE INDEX IF NOT EXISTS "Candidate_batchName_idx" ON "Candidate"("batchName");

ALTER TABLE "ImportJob" ADD COLUMN "batchName" TEXT;
