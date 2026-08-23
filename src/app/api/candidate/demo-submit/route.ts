import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildTestBlocks } from "@/lib/candidate-test-payload";
import { type AnswerMap } from "@/lib/scoring/scoringEngine";
import { ASSESSMENT_INCLUDE, scoreAndSave } from "@/lib/score-and-save";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { assignmentId?: string; answers?: unknown; submissionType?: string; token?: string };
  const assignmentId = String(b.assignmentId ?? "").trim();
  const submissionType = typeof b.submissionType === "string" ? b.submissionType : "NORMAL";
  const token = String(b.token ?? "").trim();
  if (!assignmentId) {
    return NextResponse.json({ ok: false, error: "Missing assignmentId" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const requestAnswers: AnswerMap =
    b.answers && typeof b.answers === "object" && !Array.isArray(b.answers) ? (b.answers as AnswerMap) : {};

  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: ASSESSMENT_INCLUDE,
  });

  if (!assignment || assignment.accessToken !== token) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (assignment.status === "completed") {
    return NextResponse.json({ ok: false, error: "Assignment already completed" }, { status: 400 });
  }

  const blocks = buildTestBlocks(assignment.assessment);
  if (blocks.length === 0) {
    return NextResponse.json({ ok: false, error: "No takeable items" }, { status: 400 });
  }

  // Find the IN_PROGRESS attempt to update (created by /api/candidate/attempts/start).
  // If the request body answers are empty, fall back to autosaved progressData so
  // responses are never lost when the submit fires before answers are fully hydrated.
  const inProgressAttempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId: assignment.id, status: "IN_PROGRESS", candidateId: assignment.candidateId },
    orderBy: { createdAt: "desc" },
    select: { id: true, progressData: true },
  });

  const savedAnswers = (
    inProgressAttempt?.progressData &&
    typeof inProgressAttempt.progressData === "object" &&
    !Array.isArray(inProgressAttempt.progressData)
      ? (inProgressAttempt.progressData as { answers?: AnswerMap }).answers
      : undefined
  ) ?? {};

  // Prefer live answers from the request; fall back to autosaved answers if request is empty
  const rawAnswers: AnswerMap = Object.keys(requestAnswers).length > 0 ? requestAnswers : savedAnswers;

  const result = await scoreAndSave(assignment, rawAnswers, inProgressAttempt?.id, submissionType);

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  revalidatePath("/candidate");
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/reports");

  return NextResponse.json(result);
}
