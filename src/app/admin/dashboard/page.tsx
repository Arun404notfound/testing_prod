import Link from "next/link";
import {
  Activity,
  BarChart3,
  ClipboardList,
  HelpCircle,
  UserPlus,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ModuleCard } from "@/components/ui/module-card";
import { DashboardOverview } from "@/components/ui/DashboardOverview";

const cards = [
  {
    title: "Candidates",
    description: "Add and review candidate profiles.",
    href: "/admin/candidates",
    icon: Users,
  },
  {
    title: "Questions",
    description: "Create and manage assessment questions.",
    href: "/admin/questions",
    icon: HelpCircle,
  },
  {
    title: "Assessments",
    description: "Create demo assessments from existing questions.",
    href: "/admin/assessments",
    icon: ClipboardList,
  },
  {
    title: "Assignments",
    description: "Assign assessments to candidates and track status.",
    href: "/admin/assignments",
    icon: UserPlus,
  },
  {
    title: "Reports",
    description: "Open completed attempt reports.",
    href: "/admin/reports",
    icon: BarChart3,
  },
];

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  // eslint-disable-next-line react-hooks/purity -- server component, runs per-request
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalCandidates,
    activeAssessments,
    completedTests,
    avgScoreAgg,
    pendingAssignments,
    recentAttemptsCount,
    latestCandidates,
    latestAttempts,
    latestResults,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.assessment.count({
      where: { lifecycleStatus: "published", isActive: true },
    }),
    prisma.assessmentResult.count(),
    prisma.assessmentResult.aggregate({ _avg: { overallScore: true } }),
    prisma.assessmentAssignment.count({
      where: { status: "assigned" },
    }),
    prisma.assessmentAttempt.count({
      where: {
        status: { in: ["SUBMITTED", "SCORED"] },
        updatedAt: { gte: weekAgo },
      },
    }),
    prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, fullName: true, email: true, createdAt: true },
    }),
    prisma.assessmentAttempt.findMany({
      where: { status: { in: ["SUBMITTED", "SCORED", "IN_PROGRESS"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        scoredAt: true,
        updatedAt: true,
        candidate: { select: { fullName: true } },
        assessment: { select: { title: true } },
        assignment: {
          select: {
            result: { select: { id: true } },
          },
        },
      },
    }),
    prisma.assessmentResult.findMany({
      orderBy: { completedAt: "desc" },
      take: 6,
      select: {
        id: true,
        assessmentName: true,
        completedAt: true,
        overallScore: true,
        candidate: { select: { fullName: true } },
      },
    }),
  ]);

  const rawAvg = avgScoreAgg._avg.overallScore ?? 0;
  const avgScore =
    rawAvg % 1 === 0 ? Math.round(rawAvg) : Math.round(rawAvg * 10) / 10;

  return (
    <main className="tg-page space-y-8 md:[background-image:url('/dash_logo.webp')] md:bg-cover md:bg-no-repeat md:[background-position:top_right]">
      <div className="mb-8">
        <h1 className="text-[clamp(1.8rem,3.5vw,2.75rem)] font-extrabold leading-none tracking-tight text-[#0F172A]">
          DashBoard
        </h1>
        <p className="mt-3 text-base text-[#64748B]">Live metrics from your assessment workspace.</p>
      </div>


      <section>
        <DashboardOverview
          totalCandidates={totalCandidates}
          activeAssessments={activeAssessments}
          completedTests={completedTests}
          avgScore={avgScore}
          pendingAssignments={pendingAssignments}
          recentAttemptsCount={recentAttemptsCount}
        />
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-bold text-[#0F172A]">Recent activity</h2>
        <p className="mb-4 text-base text-[#64748B]">
          Latest candidates, attempts, and completed reports (PDF downloads are client-side and not tracked server-side).
        </p>
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Latest candidates */}
          <div className="overflow-hidden rounded-2xl border border-[#BFDBFE] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] px-4 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]/10">
                <Users size={15} className="text-[#2563EB]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1E40AF]">Latest candidates</h3>
                <p className="text-[11px] text-[#3B82F6]">Newest profiles</p>
              </div>
            </div>
            <ul className="divide-y divide-[#F1F5F9]">
              {latestCandidates.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#64748B]">No candidates yet.</li>
              ) : (
                latestCandidates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[#F8FAFC]">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[11px] font-semibold text-[#2563EB]">
                        {c.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F172A]">{c.fullName}</p>
                        <p className="truncate text-[11px] text-[#64748B]">{c.email}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#94A3B8]">{formatShortDate(c.createdAt)}</span>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
              <Link href="/admin/candidates" className="text-xs font-semibold text-[#2563EB] transition-opacity hover:opacity-70">
                View all candidates →
              </Link>
            </div>
          </div>

          {/* Latest attempts */}
          <div className="overflow-hidden rounded-2xl border border-[#99F6E4] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#99F6E4] bg-gradient-to-r from-[#F0FDFA] to-[#CCFBF1] px-4 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F766E]/10">
                <Activity size={15} className="text-[#0F766E]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#134E4A]">Latest attempts</h3>
                <p className="text-[11px] text-[#0F766E]">Recent activity</p>
              </div>
            </div>
            <ul className="divide-y divide-[#F1F5F9]">
              {latestAttempts.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#64748B]">No attempts yet.</li>
              ) : (
                latestAttempts.map((a) => {
                  const statusStyles: Record<string, string> = {
                    SCORED: "bg-[#DCFCE7] text-[#166534]",
                    SUBMITTED: "bg-[#DBEAFE] text-[#1E40AF]",
                    IN_PROGRESS: "bg-[#FEF9C3] text-[#854D0E]",
                  };
                  const badgeClass = statusStyles[a.status] ?? "bg-[#F1F5F9] text-[#475569]";
                  return (
                    <li key={a.id} className="px-4 py-2.5 transition-colors hover:bg-[#F8FAFC]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#0F172A]">{a.assessment.title}</p>
                          <p className="truncate text-[11px] text-[#64748B]">{a.candidate.fullName}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                          {a.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#94A3B8]">
                        <span>{formatShortDate(a.submittedAt ?? a.scoredAt ?? a.updatedAt)}</span>
                        {a.assignment?.result?.id ? (
                          <Link
                            href={`/admin/reports/${a.assignment.result.id}`}
                            className="font-semibold text-[#0F766E] hover:opacity-70"
                          >
                            View report →
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
              <Link href="/admin/assignments" className="text-xs font-semibold text-[#0F766E] transition-opacity hover:opacity-70">
                Manage assignments →
              </Link>
            </div>
          </div>

          {/* Recent reports */}
          <div className="overflow-hidden rounded-2xl border border-[#BBF7D0] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#BBF7D0] bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] px-4 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]/10">
                <BarChart3 size={15} className="text-[#16A34A]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#14532D]">Recent reports</h3>
                <p className="text-[11px] text-[#16A34A]">Latest completed assessments</p>
              </div>
            </div>
            <ul className="divide-y divide-[#F1F5F9]">
              {latestResults.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#64748B]">No completed reports yet.</li>
              ) : (
                latestResults.map((r) => {
                  const score = Math.round(r.overallScore);
                  const scoreColor = score >= 75 ? "text-[#16A34A]" : score >= 50 ? "text-[#D97706]" : "text-[#DC2626]";
                  const scoreBg = score >= 75 ? "bg-[#DCFCE7]" : score >= 50 ? "bg-[#FEF9C3]" : "bg-[#FEE2E2]";
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[#F8FAFC]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F172A]">{r.assessmentName}</p>
                        <p className="truncate text-[11px] text-[#64748B]">{r.candidate.fullName}</p>
                        <p className="mt-0.5 text-[10px] text-[#94A3B8]">{formatShortDate(r.completedAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${scoreBg} ${scoreColor}`}>
                          {score}%
                        </span>
                        <Link href={`/admin/reports/${r.id}`} className="text-[11px] font-semibold text-[#16A34A] hover:opacity-70">
                          Open →
                        </Link>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
              <Link href="/admin/reports" className="text-xs font-semibold text-[#16A34A] transition-opacity hover:opacity-70">
                All reports →
              </Link>
            </div>
          </div>

        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-[#0F172A]">Workspace</h2>
          <p className="text-base text-[#64748B]">Choose a module to continue.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card, i) => (
            <ModuleCard
              key={card.href}
              href={card.href}
              title={card.title}
              description={card.description}
              icon={card.icon}
              colorIndex={i}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
