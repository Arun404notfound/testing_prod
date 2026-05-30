import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { tenantMatchesRow } from "@/lib/tenant-match";
import { getSession } from "@/lib/auth/session";

function accessBlocked(
  assessment: {
    lifecycleStatus: string;
    startDateTime: Date | null;
    endDateTime: Date | null;
    maxAttempts: number;
  },
  finishedAttempts: number,
): string | null {
  if (assessment.lifecycleStatus !== "published") return "not_published";
  const now = new Date();
  if (assessment.startDateTime && now < assessment.startDateTime) return "not_open";
  if (assessment.endDateTime && now > assessment.endDateTime) return "closed";
  if (finishedAttempts >= assessment.maxAttempts) return "max_attempts";
  return null;
}

const ACCESS_MESSAGES: Record<string, string> = {
  not_published: "This assessment is not published yet.",
  not_open: "This assessment is not open yet.",
  closed: "This assessment has closed.",
  max_attempts: "Maximum attempts have been used for this assignment.",
};

function readAssignmentIdFromBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const raw = (body as { assignmentId?: unknown }).assignmentId;
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw).trim();
  return "";
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { code: "invalid_json", reason: "invalid_json", message: "Request body must be JSON." },
        { status: 400 },
      );
    }

    const rawId = readAssignmentIdFromBody(body);

    if (process.env.NODE_ENV === "development") {
      console.log("[api/candidate/attempts/start] POST", { assignmentId: rawId || "(empty)" });
    }

    if (!rawId) {
      return NextResponse.json(
        {
          code: "invalid_assignment_id",
          reason: "invalid_assignment_id",
          message: 'Missing or empty assignmentId. Send { "assignmentId": "…" } in the JSON body.',
        },
        { status: 400 },
      );
    }

    const session = await getSession();
    if (!session || session.role !== "CANDIDATE" || !session.candidateId) {
      return NextResponse.json(
        {
          code: "unauthorized",
          reason: "unauthorized",
          message: "Candidate sign-in required to start an attempt.",
        },
        { status: 401 },
      );
    }

    const tenantId = await getDefaultTenantId();

    const assignment = await prisma.assessmentAssignment.findUnique({
      where: { id: rawId },
      include: {
        candidate: true,
        assessment: true,
        result: { select: { id: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          code: "assignment_not_found",
          reason: "assignment_not_found",
          message: "No assignment exists for this id.",
        },
        { status: 404 },
      );
    }

    if (!assignment.assessment) {
      return NextResponse.json(
        {
          code: "assessment_not_found",
          reason: "assessment_not_found",
          message: "The assessment for this assignment could not be loaded.",
        },
        { status: 404 },
      );
    }

    if (assignment.status === "completed") {
      return NextResponse.json(
        {
          code: "assignment_completed",
          reason: "assignment_completed",
          message: "This assessment has already been completed.",
          resultId: assignment.result?.id ?? null,
        },
        { status: 409 },
      );
    }

    if (assignment.candidateId !== session.candidateId) {
      return NextResponse.json(
        {
          code: "forbidden",
          reason: "forbidden",
          message: "This assignment does not belong to your account.",
        },
        { status: 403 },
      );
    }

    if (!tenantMatchesRow(assignment.candidate.tenantId, tenantId)) {
      return NextResponse.json(
        {
          code: "tenant_mismatch",
          reason: "tenant_mismatch",
          message: "Candidate tenant does not match the current portal tenant.",
        },
        { status: 403 },
      );
    }

    const finishedAttempts = await prisma.assessmentAttempt.count({
      where: {
        assignmentId: assignment.id,
        status: { in: ["SCORED", "SUBMITTED"] },
      },
    });

    const blocked = accessBlocked(assignment.assessment, finishedAttempts);
    if (blocked) {
      return NextResponse.json(
        {
          code: blocked,
          reason: blocked,
          message: ACCESS_MESSAGES[blocked] ?? "This assessment cannot be started right now.",
        },
        { status: 403 },
      );
    }

    const existing = await prisma.assessmentAttempt.findFirst({
      where: { assignmentId: assignment.id, status: "IN_PROGRESS" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ attemptId: existing.id });
    }

    const lastAttempt = await prisma.assessmentAttempt.findFirst({
      where: { assignmentId: assignment.id },
      orderBy: { attemptNo: "desc" },
      select: { attemptNo: true },
    });
    const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assignmentId: assignment.id,
        candidateId: assignment.candidateId,
        assessmentId: assignment.assessmentId,
        status: "IN_PROGRESS",
        attemptNo,
        startedAt: new Date(),
        proctoringCameraGranted: true,
      },
      select: { id: true },
    });

    return NextResponse.json({ attemptId: attempt.id });
  } catch (e) {
    console.error("[api/candidate/attempts/start]", e);
    return NextResponse.json(
      {
        code: "server_error",
        reason: "server_error",
        message: "Could not start attempt due to a server error. Check server logs for details.",
      },
      { status: 500 },
    );
  }
}
