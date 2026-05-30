import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  Clock,
  HelpCircle,
  Monitor,
  UserPlus,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ModuleCard } from "@/components/ui/module-card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";

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
  {
    title: "Tenants",
    description: "Client branding for reports and assessments.",
    href: "/admin/tenants",
    icon: Building2,
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
    <main className="tg-page space-y-8">
      <PageHeader title="Dashboard" subtitle="Live metrics from your assessment workspace." />

      <section className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] p-6 text-white shadow-sm md:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 16% 20%, rgba(255,255,255,0.18), transparent 44%), radial-gradient(circle at 84% 74%, rgba(255,255,255,0.10), transparent 40%), linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 40%, transparent 58%)",
          }}
        />
        <div className="relative space-y-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight md:text-[40px]">Welcome back</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-blue-100">
              Published assessments, pipeline health, and proctoring signals — refreshed from the database on each
              visit.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Candidates", value: totalCandidates },
              { label: "Active assessments", value: activeAssessments, sub: "Published" },
              { label: "Completed tests", value: completedTests, sub: "Results" },
              { label: "Avg score", value: `${avgScore}%`, sub: "All results" },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/28 bg-white/16 px-4 py-4 backdrop-blur-[2px]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">{m.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{m.value}</p>
                {"sub" in m && m.sub ? <p className="mt-1 text-[11px] text-blue-200/90">{m.sub}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard title="Total Candidates" value={totalCandidates} icon={Users} />
          <StatCard
            title="Active Assessments"
            value={activeAssessments}
            hint="Published & active"
            icon={ClipboardList}
          />
          <StatCard title="Completed Tests" value={completedTests} hint="Stored results" icon={BarChart3} />
          <StatCard title="Average Score" value={`${avgScore}%`} hint="Across all results" icon={Monitor} />
          <StatCard title="Pending Assignments" value={pendingAssignments} hint="Awaiting start" icon={Clock} />
          <StatCard
            title="Recent Attempts"
            value={recentAttemptsCount}
            hint="Submitted/scored · 7 days"
            icon={Activity}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-[#0F172A]">Recent activity</h2>
        <p className="mb-4 text-sm text-[#64748B]">
          Latest candidates, attempts, and completed reports (PDF downloads are client-side and not tracked server-side).
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="tg-card overflow-hidden p-0">
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">Latest candidates</h3>
              <p className="text-xs text-[#64748B]">Newest profiles</p>
            </div>
            <ul className="divide-y divide-[#E2E8F0]">
              {latestCandidates.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#64748B]">No candidates yet.</li>
              ) : (
                latestCandidates.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#0F172A]">{c.fullName}</p>
                      <p className="truncate text-xs text-[#64748B]">{c.email}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-[#94A3B8]">{formatShortDate(c.createdAt)}</span>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[#E2E8F0] bg-white px-4 py-2">
              <Link href="/admin/candidates" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                View all candidates →
              </Link>
            </div>
          </div>

          <div className="tg-card overflow-hidden p-0">
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">Latest attempts</h3>
              <p className="text-xs text-[#64748B]">Recent activity</p>
            </div>
            <ul className="divide-y divide-[#E2E8F0]">
              {latestAttempts.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#64748B]">No attempts yet.</li>
              ) : (
                latestAttempts.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F172A]">{a.assessment.title}</p>
                        <p className="truncate text-xs text-[#64748B]">{a.candidate.fullName}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {a.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#94A3B8]">
                      <span>{formatShortDate(a.submittedAt ?? a.scoredAt ?? a.updatedAt)}</span>
                      {a.assignment?.result?.id ? (
                        <Link
                          href={`/admin/reports/${a.assignment.result.id}`}
                          className="font-medium text-[#1D4ED8] hover:underline"
                        >
                          Report
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[#E2E8F0] bg-white px-4 py-2">
              <Link href="/admin/assignments" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                Manage assignments →
              </Link>
            </div>
          </div>

          <div className="tg-card overflow-hidden p-0">
            <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">Recent reports</h3>
              <p className="text-xs text-[#64748B]">Latest completed assessments</p>
            </div>
            <ul className="divide-y divide-[#E2E8F0]">
              {latestResults.length === 0 ? (
                <li className="px-4 py-6 text-sm text-[#64748B]">No completed reports yet.</li>
              ) : (
                latestResults.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#0F172A]">{r.assessmentName}</p>
                      <p className="truncate text-xs text-[#64748B]">{r.candidate.fullName}</p>
                      <p className="mt-1 text-[11px] text-[#94A3B8]">{formatShortDate(r.completedAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-[#0F172A]">
                        {Math.round(r.overallScore)}%
                      </span>
                      <Link href={`/admin/reports/${r.id}`} className="text-xs font-medium text-[#1D4ED8] hover:underline">
                        Open
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[#E2E8F0] bg-white px-4 py-2">
              <Link href="/admin/reports" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                All reports →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-[#0F172A]">Workspace</h2>
          <p className="text-sm text-[#64748B]">Choose a module to continue.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <ModuleCard
              key={card.href}
              href={card.href}
              title={card.title}
              description={card.description}
              icon={card.icon}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
