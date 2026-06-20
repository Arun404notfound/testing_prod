import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCandidateRoleSession } from "@/lib/auth/require-user";
import { autoSubmitAbandonedAttempts } from "@/lib/score-and-save";
import { AssignmentsList } from "./assignments-list";


export default async function CandidatePage() {
  const session = await requireCandidateRoleSession();

  if (!session.candidateId) {
    return (
      <main className="tg-page">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-950">No candidate profile linked</h2>
          <p className="mt-2 text-sm text-amber-800">
            Ask your administrator to link your account to a candidate profile, or sign in with the correct email.
          </p>
        </div>
      </main>
    );
  }

  // Auto-submit any tests interrupted by sign-out, power-off, etc. — best-effort, never blocks the page
  try { await autoSubmitAbandonedAttempts(session.candidateId); } catch (e) {
    console.error("[autoSubmitAbandoned]", e);
  }

  const [assignments, activeAttempts] = await Promise.all([
    prisma.assessmentAssignment.findMany({
      where: { candidateId: session.candidateId },
      include: { assessment: true, result: true },
      orderBy: { assignedAt: "desc" },
    }),
    prisma.assessmentAttempt.findMany({
      where: { candidateId: session.candidateId, status: "IN_PROGRESS" },
      select: { assignmentId: true },
    }),
  ]);
  const activeAssignmentIds = new Set(activeAttempts.map((a) => a.assignmentId));

  const completed = assignments.filter((a) => a.status === "completed").length;
  const pending = assignments.filter((a) => a.status === "assigned").length;
  const inProgress = 0;

  return (
    <main className="tg-page space-y-8">

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F766E] via-[#0F766E] to-[#0D9488] px-6 py-8 text-white md:px-10 md:py-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.12), transparent 50%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.08), transparent 40%)",
          }}
        />
        <div className="relative">
          <p className="text-sm font-medium text-blue-200 uppercase tracking-widest mb-2">Assessment Portal</p>
          <h1 className="text-2xl font-bold md:text-3xl">My Assessments</h1>
          <p className="mt-2 text-blue-100 text-sm max-w-lg">
            Complete your assigned psychometric assessments below. Each assessment takes approximately 20–30 minutes.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { icon: ClipboardList, label: "Total", value: assignments.length },
              { icon: Clock, label: "Pending", value: pending + inProgress },
              { icon: CheckCircle2, label: "Completed", value: completed },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <stat.icon size={18} className="text-blue-200" />
                <div>
                  <p className="text-xs text-blue-200">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assignments list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Assigned Assessments</h2>
        <AssignmentsList
          assignments={assignments.map((a) => {
            const isExpired = a.expiresAt != null && new Date() > a.expiresAt && a.status === "assigned";
            return {
              id: a.id,
              status: isExpired ? "expired" : a.status,
              assignedAt: a.assignedAt.toISOString(),
              expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
              assessment: { title: a.assessment.title, description: a.assessment.description ?? null },
              result: a.result ? { id: a.result.id } : null,
              hasActiveAttempt: activeAssignmentIds.has(a.id),
            };
          })}
        />
      </section>
    </main>
  );
}
