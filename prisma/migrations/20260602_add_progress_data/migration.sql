-- Auto-save progress snapshot for AssessmentAttempt
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "progressData" JSONB;
