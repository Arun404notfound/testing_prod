-- Submission type tag for AssessmentAttempt
-- Values: NORMAL | TIMED_OUT | SIGNED_OUT | TAB_CLOSED | AUTO_SUBMITTED
ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "submissionType" TEXT;
