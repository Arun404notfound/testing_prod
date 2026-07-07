import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type AnswerMap } from "@/lib/scoring/scoringEngine";
import { ASSESSMENT_INCLUDE, scoreAndSave } from "@/lib/score-and-save";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;

    const reqBody = await req.json().catch(() => ({})) as { token?: string; submissionType?: string };
    const token = typeof reqBody.token === "string" ? reqBody.token : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, assignment: { accessToken: token } },
      select: { id: true, assignmentId: true, status: true, progressData: true },
    });

    if (!attempt?.assignmentId) {
      return NextResponse.json({ ok: false, error: "Attempt not found" }, { status: 404 });
    }

    // Already scored — return the existing result
    if (attempt.status === "SCORED" || attempt.status === "SUBMITTED") {
      const result = await prisma.assessmentResult.findFirst({
        where: { assignmentId: attempt.assignmentId },
        select: { id: true },
      });
      return NextResponse.json({ ok: true, resultId: result?.id ?? null, alreadyScored: true });
    }

    // Assignment already completed — nothing to do
    const assignment = await prisma.assessmentAssignment.findUnique({
      where: { id: attempt.assignmentId },
      select: { status: true },
    });
    if (assignment?.status === "completed") {
      const result = await prisma.assessmentResult.findFirst({
        where: { assignmentId: attempt.assignmentId },
        select: { id: true },
      });
      return NextResponse.json({ ok: true, resultId: result?.id ?? null, alreadyScored: true });
    }

    // Load full assignment for scoring
    const full = await prisma.assessmentAssignment.findUnique({
      where: { id: attempt.assignmentId },
      include: ASSESSMENT_INCLUDE,
    });
    if (!full) {
      return NextResponse.json({ ok: false, error: "Assignment not found" }, { status: 404 });
    }

    // Parse saved answers from progressData
    const pd = attempt.progressData as { answers?: Record<string, unknown> } | null;
    const answers = (pd?.answers ?? {}) as AnswerMap;

    const submissionType = reqBody.submissionType ?? "SIGNED_OUT";

    const result = await scoreAndSave(full, answers, attempt.id, submissionType);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[submit-progress]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
