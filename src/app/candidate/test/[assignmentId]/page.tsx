import { notFound, redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { seededShuffle } from "@/lib/shuffle";
import { buildTestBlocks, shuffleBlockOptions, type TestBlock } from "@/lib/candidate-test-payload";
import { logAudit } from "@/lib/audit-log";
import { InstructionsGate } from "./instructions-gate";

function testAccessBlocked(
  assessment: {
    lifecycleStatus: string;
    startDateTime: Date | null;
    endDateTime: Date | null;
    maxAttempts: number;
  },
  scoredAttempts: number,
): string | null {
  if (assessment.lifecycleStatus !== "published") return "This assessment is not published yet.";
  const now = new Date();
  if (assessment.startDateTime && now < assessment.startDateTime) return "This assessment is not open yet.";
  if (assessment.endDateTime && now > assessment.endDateTime) return "This assessment has closed.";
  if (scoredAttempts >= assessment.maxAttempts) return "Maximum attempts have been used for this assignment.";
  return null;
}

export default async function CandidateTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { assignmentId } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      candidate: true,
      programAssignment: { select: { id: true, accessToken: true } },
      assessment: {
        include: {
          tenant: true,
          questions: { include: { question: true } },
          sections: { orderBy: { displayOrder: "asc" } },
          items: {
            include: { section: true, options: { orderBy: { displayOrder: "asc" } }, likertScale: true, images: { orderBy: { displayOrder: "asc" } } },
            orderBy: { displayOrder: "asc" },
          },
          triadGroups: {
            include: { section: true, statements: { orderBy: { displayOrder: "asc" } } },
            orderBy: { displayOrder: "asc" },
          },
          caseStudies: {
            include: {
              section: true,
              subQuestions: {
                include: { section: true, options: { orderBy: { displayOrder: "asc" } }, images: { orderBy: { displayOrder: "asc" } } },
                orderBy: { displayOrder: "asc" },
              },
            },
            orderBy: { displayOrder: "asc" },
          },
          compositionItems: {
            orderBy: { displayOrder: "asc" },
            include: {
              section: true,
              sourceItem: {
                include: { section: true, options: { orderBy: { displayOrder: "asc" } }, likertScale: true, images: { orderBy: { displayOrder: "asc" } } },
              },
              sourceTriad: {
                include: { section: true, statements: { orderBy: { displayOrder: "asc" } } },
              },
              sourceCaseStudy: {
                include: {
                  section: true,
                  subQuestions: {
                    include: { section: true, options: { orderBy: { displayOrder: "asc" } }, images: { orderBy: { displayOrder: "asc" } } },
                    orderBy: { displayOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assignment || assignment.accessToken !== token) {
    notFound();
  }

  // Evidence trail: every valid access to the candidate's test link, so a dispute
  // over whether the candidate reached the assessment can be checked against this log.
  await logAudit({
    tenantId: assignment.assessment.tenantId,
    actorType: "CANDIDATE",
    actorId: assignment.candidateId,
    action: "LOGIN",
    entityType: "AssessmentAssignment",
    entityId: assignment.id,
    message: `${assignment.candidate.fullName} accessed the test link for "${assignment.assessment.title}"`,
  });

  // Once an assignment is completed (or a result already exists — covers stale-status edge
  // cases like a concurrent tab or cached page), the candidate never sees their own report.
  // Reports are for admins/tenants to review and share at their discretion.
  const hasExistingResult = Boolean(
    await prisma.assessmentResult.findFirst({
      where: { assignmentId: assignment.id },
      select: { id: true },
    }),
  );
  if (assignment.status === "completed" || hasExistingResult) {
    // Part of a Program — send them to the Program entry route instead of a
    // per-module dead end, so it can route to the next incomplete module (or
    // the Program-level completion screen if every module is done).
    if (assignment.programAssignment) {
      redirect(`/candidate/program/${assignment.programAssignment.id}?token=${assignment.programAssignment.accessToken}`);
    }
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2} />
          </div>
          <p className="text-xl font-semibold text-[#0F172A]">Thank You!</p>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            You&apos;ve already completed{" "}
            <span className="font-medium text-[#0F172A]">{assignment.assessment.title}</span>. Your responses
            have been submitted successfully.
          </p>
          <p className="mt-6 text-xs text-[#94A3B8]">You may now close this window.</p>
        </div>
      </div>
    );
  }

  // Check expiry: if the assignment has a deadline that has passed and it's not yet started/completed
  if (assignment.expiresAt && new Date() > assignment.expiresAt && assignment.status === "assigned") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-red-800">Assignment Expired</p>
          <p className="mt-2 text-sm text-red-700">
            This assignment expired on{" "}
            {assignment.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
          </p>
          <p className="mt-4 text-sm text-red-700">Contact your administrator if you believe this is a mistake.</p>
        </div>
      </div>
    );
  }

  const scoredAttempts = await prisma.assessmentAttempt.count({
    where: { assignmentId: assignment.id, status: { in: ["SCORED", "SUBMITTED"] } },
  });
  const accessBlocked = testAccessBlocked(assignment.assessment, scoredAttempts);

  let blocks = buildTestBlocks(assignment.assessment);
  // Seeded by the assignment id (stable per candidate) so the order survives reloads/resumes
  // but still differs from one candidate's assignment to the next.
  if (assignment.assessment.randomizeQuestions) blocks = seededShuffle(blocks, `${assignment.id}:questions`);
  blocks = shuffleBlockOptions(blocks, assignment.assessment.randomizeOptions, assignment.id);

  // Per-assignment duration overrides the assessment default; fall back to assessment value if not set
  const durationMinutes = assignment.durationMinutes ?? assignment.assessment.durationMinutes;
  const durationIsOverridden = assignment.durationMinutes !== null && assignment.durationMinutes !== assignment.assessment.durationMinutes;

  if (accessBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <p className="font-semibold text-amber-900">{accessBlocked}</p>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] p-6">
        <div className="max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
          <p className="text-[#64748B]">This assessment has no takeable items yet.</p>
        </div>
      </div>
    );
  }

  const activeAttempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId: assignment.id, status: "IN_PROGRESS" },
    select: { id: true, progressData: true, startedAt: true },
  });

  // An in-progress attempt's question order was snapshotted once at attempt creation
  // (see /api/candidate/attempts/start) — always resume with that exact order rather than
  // the order freshly computed above, which can drift if randomization settings or the
  // assessment's content change after the attempt started.
  const savedBlockOrder = (activeAttempt?.progressData as { blockOrder?: string[] } | null)?.blockOrder;
  if (Array.isArray(savedBlockOrder) && savedBlockOrder.length > 0) {
    const byKey = new Map(blocks.map((b) => [b.key, b]));
    const ordered: TestBlock[] = [];
    for (const key of savedBlockOrder) {
      const b = byKey.get(key);
      if (b) {
        ordered.push(b);
        byKey.delete(key);
      }
    }
    // Anything not in the saved order (e.g. content added after the attempt started) goes last.
    for (const b of blocks) {
      if (byKey.has(b.key)) ordered.push(b);
    }
    blocks = ordered;
  }

  // Remaining time is always derived server-side from the immutable `startedAt` anchor,
  // never from a client-ticked snapshot that could be overwritten out of order.
  const totalSeconds = durationMinutes > 0 ? durationMinutes * 60 : 0;
  const activeRemainingSeconds =
    activeAttempt && totalSeconds > 0 && activeAttempt.startedAt
      ? Math.max(0, totalSeconds - Math.floor((Date.now() - activeAttempt.startedAt.getTime()) / 1000))
      : activeAttempt
        ? 0
        : undefined;

  return (
    <InstructionsGate
      assignmentId={assignment.id}
      accessToken={token}
      blocks={blocks}
      assessmentTitle={assignment.assessment.title}
      candidateName={assignment.candidate.fullName}
      moduleType={assignment.assessment.moduleType}
      customInstructions={assignment.assessment.customInstructions}
      durationMinutes={durationMinutes}
      assessmentDurationMinutes={assignment.assessment.durationMinutes}
      durationIsOverridden={durationIsOverridden}
      activeAttemptId={activeAttempt?.id}
      activeProgressData={activeAttempt?.progressData as { answers?: Record<string, unknown> } | null | undefined}
      activeRemainingSeconds={activeRemainingSeconds}
    />
  );
}
