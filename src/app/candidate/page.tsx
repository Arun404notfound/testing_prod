import Link from "next/link";
import { ClipboardList, CheckCircle2, Clock, ChevronRight, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCandidateRoleSession } from "@/lib/auth/require-user";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    assigned: { label: "Pending", bg: "#FFF7ED", text: "#C2410C", dot: "#F97316" },
    in_progress: { label: "In Progress", bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
    completed: { label: "Completed", bg: "#F0FDF4", text: "#15803D", dot: "#22C55E" },
  };
  const s = map[status] ?? { label: status, bg: "#F1F5F9", text: "#475569", dot: "#94A3B8" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

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

  const assignments = await prisma.assessmentAssignment.findMany({
    where: { candidateId: session.candidateId },
    include: { assessment: true, result: true },
    orderBy: { assignedAt: "desc" },
  });

  const completed = assignments.filter((a) => a.status === "completed").length;
  const pending = assignments.filter((a) => a.status === "assigned").length;
  const inProgress = 0;

  return (
    <main className="tg-page space-y-8">

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] px-6 py-8 text-white md:px-10 md:py-10">
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

        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white py-16 text-center">
            <BookOpen size={40} className="text-[#CBD5E1] mb-3" />
            <p className="font-medium text-[#475569]">No assessments assigned yet</p>
            <p className="mt-1 text-sm text-[#94A3B8]">Your administrator will assign assessments to you shortly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const isDone = assignment.status === "completed" && assignment.result;
              return (
                <div
                  key={assignment.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all hover:border-[#93C5FD] hover:shadow-md md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: isDone ? "#F0FDF4" : "#EFF6FF" }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={24} className="text-emerald-600" />
                      ) : (
                        <ClipboardList size={24} className="text-[#1D4ED8]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-[#0F172A]">{assignment.assessment.title}</p>
                        <StatusBadge status={assignment.status} />
                      </div>
                      {assignment.assessment.description ? (
                        <p className="mt-1 text-sm text-[#64748B] line-clamp-2">{assignment.assessment.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-[#94A3B8]">
                        Assigned on {new Date(assignment.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {isDone ? (
                    <Link
                      href={`/candidate/reports/${assignment.result!.id}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F1F5F9]"
                    >
                      View Report
                      <ChevronRight size={16} />
                    </Link>
                  ) : (
                    <Link
                      href={`/candidate/test/${assignment.id}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E40AF] hover:shadow-md"
                    >
                      Start Test
                      <ChevronRight size={16} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
