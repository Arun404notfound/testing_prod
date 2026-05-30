import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { tenantMatchesRow } from "@/lib/tenant-match";
import { getSession } from "@/lib/auth/session";
import { shuffleArray } from "@/lib/shuffle";
import { buildTestBlocks, shuffleBlockOptions } from "@/lib/candidate-test-payload";
import { CandidateTestRunner } from "./test-runner";

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

  const scoredAttempts = await prisma.assessmentAttempt.count({
    where: { assignmentId: assignment.id, status: { in: ["SCORED", "SUBMITTED"] } },
  });
  const accessBlocked = testAccessBlocked(assignment.assessment, scoredAttempts);

  let blocks = buildTestBlocks(assignment.assessment);
  if (assignment.assessment.randomizeQuestions) blocks = shuffleArray(blocks);
  blocks = shuffleBlockOptions(blocks, assignment.assessment.randomizeOptions);

  // 45 minutes per 50 questions; scale proportionally for other sizes
  const durationMinutes = Math.max(10, Math.round((blocks.length / 50) * 45));

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

  return (
    <CandidateTestRunner
      assignmentId={assignment.id}
      blocks={blocks}
      assessmentTitle={assignment.assessment.title}
      candidateName={assignment.candidate.fullName}
      durationMinutes={durationMinutes}
    />
  );
}
