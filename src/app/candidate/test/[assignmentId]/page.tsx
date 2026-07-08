import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { shuffleArray } from "@/lib/shuffle";
import { buildTestBlocks, shuffleBlockOptions } from "@/lib/candidate-test-payload";
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
      assessment: {
        include: {
          tenant: true,
          questions: { include: { question: true } },
          sections: { orderBy: { displayOrder: "asc" } },
          items: {
            include: { section: true, options: { orderBy: { displayOrder: "asc" } }, likertScale: true },
            orderBy: { displayOrder: "asc" },
          },
          triadGroups: {
            include: { section: true, statements: { orderBy: { displayOrder: "asc" } } },
            orderBy: { displayOrder: "asc" },
          },
          compositionItems: {
            orderBy: { displayOrder: "asc" },
            include: {
              section: true,
              sourceItem: {
                include: { section: true, options: { orderBy: { displayOrder: "asc" } }, likertScale: true },
              },
              sourceTriad: {
                include: { section: true, statements: { orderBy: { displayOrder: "asc" } } },
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
  if (assignment.status === "completed") {
    const existingResult = await prisma.assessmentResult.findFirst({
      where: { assignmentId: assignment.id },
      select: { id: true },
    });
    if (existingResult) redirect(`/candidate/reports/${existingResult.id}?token=${token}`);
    notFound();
  }

  // Secondary guard: if a result already exists for this assignment, send the candidate there.
  // This covers edge cases where assignment.status is stale (e.g. concurrent tab, cached page).
  const existingResult = await prisma.assessmentResult.findFirst({
    where: { assignmentId: assignment.id },
    select: { id: true },
  });
  if (existingResult) redirect(`/candidate/reports/${existingResult.id}?token=${token}`);

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
  if (assignment.assessment.randomizeQuestions) blocks = shuffleArray(blocks);
  blocks = shuffleBlockOptions(blocks, assignment.assessment.randomizeOptions);

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
      durationMinutes={durationMinutes}
      assessmentDurationMinutes={assignment.assessment.durationMinutes}
      durationIsOverridden={durationIsOverridden}
      activeAttemptId={activeAttempt?.id}
      activeProgressData={activeAttempt?.progressData as { answers?: Record<string, unknown> } | null | undefined}
      activeRemainingSeconds={activeRemainingSeconds}
    />
  );
}
