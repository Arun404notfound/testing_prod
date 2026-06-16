import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CANDIDATE" || !session.candidateId) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { attemptId } = await params;
    if (!attemptId) return NextResponse.json({ ok: false }, { status: 400 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { answers, skippedKeys, remainingSeconds, trigger } = body as {
      answers?: Record<string, unknown>;
      skippedKeys?: string[];
      remainingSeconds?: number;
      trigger?: string;
    };

    // Verify the attempt belongs to this candidate and is still in progress
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        candidateId: session.candidateId,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    });

    if (!attempt) {
      // Attempt already scored/submitted or doesn't belong to candidate — silently succeed
      // so the client doesn't show an error on normal completion flow
      return NextResponse.json({ ok: true, skipped: true });
    }

    const snapshot = {
      answers: answers ?? {},
      skippedKeys: skippedKeys ?? [],
      savedAt: new Date().toISOString(),
      ...(remainingSeconds !== undefined ? { remainingSeconds } : {}),
      ...(trigger ? { trigger } : {}),
    };

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progressData: snapshot as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[autosave]", e);
    // Never surface errors to the client — auto-save is best-effort
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
