import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { tenantMatchesRow } from "@/lib/tenant-match";
import { getSession } from "@/lib/auth/session";
import type { ProctoringEventType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const MAX_SNAPSHOT_CHARS = 450_000;

type ProctorBody =
  | { action: "event"; eventType: ProctoringEventType }
  | { action: "snapshot"; dataUrl: string }
  | { action: "camera"; granted: boolean };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attempt id" }, { status: 400 });
  }

  let body: ProctorBody;
  try {
    body = (await request.json()) as ProctorBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const session = await getSession();
  if (!session || session.role !== "CANDIDATE" || !session.candidateId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getDefaultTenantId();
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { id: attemptId, status: "IN_PROGRESS" },
    include: {
      assignment: { include: { candidate: true, assessment: true } },
    },
  });

  if (
    !attempt ||
    !attempt.assignment ||
    attempt.assignment.candidateId !== session.candidateId ||
    !tenantMatchesRow(attempt.assignment.candidate.tenantId, tenantId)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "event") {
    if (body.eventType !== "TAB_SWITCH" && body.eventType !== "FULLSCREEN_EXIT") {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    await prisma.proctoringEvent.create({
      data: { attemptId, type: body.eventType },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "camera") {
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { proctoringCameraGranted: Boolean(body.granted) },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "snapshot") {
    const raw = typeof body.dataUrl === "string" ? body.dataUrl : "";
    const dataUrl = raw.length > MAX_SNAPSHOT_CHARS ? raw.slice(0, MAX_SNAPSHOT_CHARS) : raw;
    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { proctoringSnapshot: dataUrl || null },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
