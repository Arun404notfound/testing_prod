import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { tenantMatchesRow } from "@/lib/tenant-match";
import { getSession } from "@/lib/auth/session";
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
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams?: Promise<unknown>;
}) {
  const { assignmentId } = await params;
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE" || !session.candidateId) notFound();

  const tenantId = await getDefaultTenantId();
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

  if (!assignment || assignment.candidateId !== session.candidateId || !tenantMatchesRow(assignment.candidate.tenantId, tenantId)) {
    notFound();
  }
  if (assignment.status === "completed") redirect("/candidate");

  // Secondary guard: if a result already exists for this assignment, send the candidate there.
  // This covers edge cases where assignment.status is stale (e.g. concurrent tab, cached page).
  const existingResult = await prisma.assessmentResult.findFirst({
    where: { assignmentId: assignment.id },
    select: { id: true },
  });
  if (existingResult) redirect(`/candidate/reports/${existingResult.id}`);

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
          <a href="/candidate" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-red-300 hover:shadow-md">
            ← Back to Dashboard
          </a>
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

  return (
    <InstructionsGate
      assignmentId={assignment.id}
      blocks={blocks}
      assessmentTitle={assignment.assessment.title}
      candidateName={assignment.candidate.fullName}
      durationMinutes={durationMinutes}
      assessmentDurationMinutes={assignment.assessment.durationMinutes}
      durationIsOverridden={durationIsOverridden}
      activeAttemptId={activeAttempt?.id}
      activeProgressData={activeAttempt?.progressData as { answers?: Record<string, unknown> } | null | undefined}
      activeStartedAt={activeAttempt?.startedAt?.toISOString()}
    />
  );
}
