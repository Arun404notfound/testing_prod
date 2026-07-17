import Link from "next/link";
import { BackToDashboard } from "@/components/ui/back-to-dashboard";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { FileSpreadsheet, Search, X } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

type SearchParams = {
  assessment?: string;
  candidate?: string;
  employeeId?: string;
  batch?: string;
};

export default async function ReportsIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const assessmentQ = sp.assessment?.trim() ?? "";
  const candidateQ = sp.candidate?.trim() ?? "";
  const employeeIdQ = sp.employeeId?.trim() ?? "";
  const batchQ = sp.batch?.trim() ?? "";

  const hasFilter = Boolean(assessmentQ || candidateQ || employeeIdQ || batchQ);

  // Build WHERE clause — all filters are optional and combinable
  const where: Prisma.AssessmentResultWhereInput = {
    candidate: { tenantId },
    ...(candidateQ && {
      candidate: {
        tenantId,
        fullName: { contains: candidateQ },
      },
    }),
    ...(employeeIdQ && {
      candidate: {
        tenantId,
        employeeId: { contains: employeeIdQ },
      },
    }),
    ...(assessmentQ && {
      OR: [
        { assessmentName: { contains: assessmentQ } },
        { assessment: { title: { contains: assessmentQ } } },
      ],
    }),
  };

  // Merge candidate filters properly (Prisma needs a single candidate block)
  const candidateFilter: Prisma.CandidateWhereInput = { tenantId };
  if (candidateQ) candidateFilter.fullName = { contains: candidateQ };
  if (employeeIdQ) candidateFilter.employeeId = { contains: employeeIdQ };
  if (batchQ) candidateFilter.batchName = batchQ;

  const mergedWhere: Prisma.AssessmentResultWhereInput = {
    candidate: candidateFilter,
    ...(assessmentQ && {
      OR: [
        { assessmentName: { contains: assessmentQ } },
        { assessment: { title: { contains: assessmentQ } } },
      ],
    }),
  };

  const results = await prisma.assessmentResult.findMany({
    where: mergedWhere,
    include: {
      candidate: { select: { fullName: true, email: true, employeeId: true, batchName: true } },
      assessment: { select: { title: true, assessmentType: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  // Distinct assessment names for the datalist autocomplete
  const [allAssessments, batchRows] = await Promise.all([
    prisma.assessmentResult.findMany({
      where: { candidate: { tenantId } },
      select: { assessmentName: true, assessment: { select: { title: true } } },
      distinct: ["assessmentName"],
    }),
    prisma.candidate.findMany({
      where: { tenantId },
      select: { batchName: true },
      orderBy: { batchName: "asc" },
    }),
  ]);
  const assessmentOptions = Array.from(
    new Set(
      allAssessments.map((r) => r.assessment?.title ?? r.assessmentName).filter(Boolean),
    ),
  ).sort();
  const batchOptions = [...new Set(batchRows.map((b) => b.batchName).filter((b): b is string => Boolean(b)))];

  // Clear-filter URL (removes all params)
  const clearUrl = "/admin/reports";

  return (
    <main className="tg-page space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Assessment Reports</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {hasFilter
              ? `${results.length} result${results.length === 1 ? "" : "s"} matching filters`
              : `${results.length} total result${results.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <BackToDashboard />
      </div>

      {/* Filter bar */}
      <section className="overflow-hidden rounded-2xl border border-[#D1D9E6] bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC] px-5 py-3.5">
          <div className="h-4 w-1 rounded-full bg-[#0F766E]" />
          <p className="text-sm font-bold text-[#0F172A]">Filter Results</p>
        </div>
        <div className="p-4">
        <form method="GET" action="/admin/reports" className="flex flex-wrap items-end gap-3">

          {/* Assessment name */}
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-[#475569]">
              Assessment Name
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                name="assessment"
                defaultValue={assessmentQ}
                placeholder="e.g. Testing1"
                list="assessment-options"
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-8 pr-3 text-sm text-[#334155] placeholder-[#CBD5E1] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
              <datalist id="assessment-options">
                {assessmentOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Employee / candidate name */}
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-[#475569]">
              Employee Name
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                name="candidate"
                defaultValue={candidateQ}
                placeholder="e.g. Alex Chen"
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-8 pr-3 text-sm text-[#334155] placeholder-[#CBD5E1] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Employee ID */}
          <div className="min-w-[150px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-[#475569]">
              Employee ID
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                name="employeeId"
                defaultValue={employeeIdQ}
                placeholder="e.g. EMP001"
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-8 pr-3 text-sm text-[#334155] placeholder-[#CBD5E1] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Batch */}
          {batchOptions.length > 0 && (
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-[#475569]">Batch</label>
              <select
                name="batch"
                defaultValue={batchQ}
                className="w-full rounded-lg border border-[#E2E8F0] py-2 px-3 text-sm text-[#334155] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                <option value="">All batches</option>
                {batchOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4EDB]"
            >
              Apply
            </button>
            {hasFilter && (
              <Link
                href={clearUrl}
                className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#F1F5F9]"
              >
                <X size={13} />
                Clear
              </Link>
            )}
          </div>
        </form>

        {/* Active filter chips */}
        {hasFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#94A3B8]">Active filters:</span>
            {assessmentQ && (
              <FilterChip label="Assessment" value={assessmentQ} param="assessment" currentParams={sp} />
            )}
            {candidateQ && (
              <FilterChip label="Employee" value={candidateQ} param="candidate" currentParams={sp} />
            )}
            {employeeIdQ && (
              <FilterChip label="Employee ID" value={employeeIdQ} param="employeeId" currentParams={sp} />
            )}
            {batchQ && (
              <FilterChip label="Batch" value={batchQ} param="batch" currentParams={sp} />
            )}
          </div>
        )}
        </div>
      </section>

      {/* Results table */}
      <section className="overflow-hidden rounded-2xl border border-[#D1D9E6] bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#EFF6FF] to-[#F8FAFC] px-5 py-4">
          <div className="h-4 w-1 rounded-full bg-[#2563EB]" />
          <p className="text-base font-bold text-[#0F172A]">
            Completed Results
          </p>
          {hasFilter && (
            <span className="ml-1 rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[10px] font-bold text-white">
              {results.length} filtered
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold uppercase tracking-wider text-[#475569]">
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Employee ID</th>
                <th className="px-5 py-3.5">Assessment</th>
                <th className="px-5 py-3.5">Score</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Report</th>
                <th className="px-5 py-3.5">Submissions</th>
                <th className="px-5 py-3.5">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {results.map((result) => (
                <tr key={result.id} className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#0F172A]">{result.candidate.fullName}</p>
                    <p className="text-xs text-[#94A3B8]">{result.candidate.email}</p>
                    {result.candidate.batchName && (
                      <span className="mt-0.5 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        {result.candidate.batchName}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-mono font-medium text-[#475569]">
                      {result.candidate.employeeId || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#334155]">
                    {result.assessment?.title ?? result.assessmentName}
                  </td>
                  <td className="px-5 py-3">
                    {result.assessment?.assessmentType === "MCQ" ? (
                      <span className={`font-semibold ${
                        result.overallScore >= 70
                          ? "text-emerald-600"
                          : result.overallScore >= 50
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}>
                        {result.overallScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-[#64748B]">
                    {new Date(result.completedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/reports/${result.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1 text-xs font-semibold text-[#0F766E] transition-colors hover:bg-[#CCFBF1]"
                    >
                      Open Report →
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/reports/${result.id}/submissions`}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                    >
                      View Submissions
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`/api/reports/${result.id}/responses.xlsx`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                      title={`Export ${result.candidate.fullName}'s responses to Excel`}
                    >
                      <FileSpreadsheet size={13} aria-hidden="true" />
                      Export XLSX
                    </a>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center">
                    <p className="text-sm text-[#64748B]">
                      {hasFilter
                        ? "No results match the applied filters. Try adjusting or clearing them."
                        : "No completed results yet."}
                    </p>
                    {hasFilter && (
                      <Link
                        href={clearUrl}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#0F766E] hover:underline"
                      >
                        <X size={13} /> Clear all filters
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

// ── Filter chip: removes one filter while keeping the others ──────────────────
function FilterChip({
  label,
  value,
  param,
  currentParams,
}: {
  label: string;
  value: string;
  param: string;
  currentParams: SearchParams;
}) {
  const next = new URLSearchParams();
  if (param !== "assessment" && currentParams.assessment) next.set("assessment", currentParams.assessment);
  if (param !== "candidate" && currentParams.candidate) next.set("candidate", currentParams.candidate);
  if (param !== "employeeId" && currentParams.employeeId) next.set("employeeId", currentParams.employeeId);
  if (param !== "batch" && currentParams.batch) next.set("batch", currentParams.batch);
  const href = `/admin/reports${next.toString() ? `?${next.toString()}` : ""}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-medium text-[#2563EB] transition hover:bg-blue-100"
    >
      <span className="text-[#94A3B8]">{label}:</span>
      {value}
      <X size={11} />
    </Link>
  );
}
