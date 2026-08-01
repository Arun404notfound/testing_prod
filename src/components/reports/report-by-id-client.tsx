"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, ListChecks, FileWarning, FileX2 } from "lucide-react";
import type { ReportPayload } from "@/lib/report-data";
import { normalizeReportPayload } from "@/lib/normalize-report-payload";
import { formatReportCompletedDate } from "@/lib/report-date";
import { pdfFileName } from "@/lib/pdf-filename";
import { reportTheme } from "@/components/reports/report-theme";
import { ReportDocument } from "@/components/reports/ReportDocument";


const SUBMISSION_META: Record<string, { label: string; detail: string; color: string; bg: string; border: string }> = {
  TIMED_OUT:      { label: "Timer Expired",         detail: "The assessment time limit was reached and the test was auto-submitted.",                                    color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  SIGNED_OUT:     { label: "Signed Out Mid-Test",   detail: "The candidate chose to sign out before completing the assessment. All saved answers were submitted.",       color: "#1D4EDB", bg: "#EFF6FF", border: "#BFDBFE" },
  TAB_CLOSED:     { label: "Tab / Window Closed",   detail: "The browser tab or window was closed before the assessment was formally submitted. Progress was auto-saved and submitted on next login.", color: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE" },
  AUTO_SUBMITTED: { label: "Technical Interruption", detail: "The assessment was interrupted — possibly due to a power loss, browser crash, or connectivity issue — and was auto-submitted with the last saved progress on the candidate's next login.", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
};

function SubmissionTypeBanner({ submissionType }: { submissionType: string }) {
  const meta = SUBMISSION_META[submissionType];
  if (!meta) return null;
  return (
    <div
      className="mb-2 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
      style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
    >
      <span className="mt-0.5 shrink-0 text-base">⚠</span>
      <div>
        <span className="font-semibold">{meta.label}. </span>
        <span style={{ opacity: 0.85 }}>{meta.detail}</span>
      </div>
    </div>
  );
}

export default function ReportByIdClient() {
  const { resultId } = useParams<{ resultId: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const isCandidate = pathname.startsWith("/candidate/reports");
  const backHref = "/admin/reports";
  const backLabel = "Back to reports";

  const hasResultId = Boolean(resultId);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!hasResultId) return;
    (async () => {
      const url = token ? `/api/reports/${resultId}?token=${encodeURIComponent(token)}` : `/api/reports/${resultId}`;
      const response = await fetch(url);
      if (response.ok) {
        const normalized = normalizeReportPayload(await response.json());
        if (normalized) setReport(normalized);
      }
      setLoading(false);
    })();
  }, [hasResultId, resultId, token]);

  const completedDate = useMemo(() => (report ? formatReportCompletedDate(report.completedAt) : "-"), [report]);

  // The PDF is generated server-side by loading the same report in headless
  // Chrome and printing it — the actual browser renders it, so the exported
  // PDF always matches this on-screen preview pixel-for-pixel.
  async function downloadPdf() {
    if (!report) return;
    setDownloading(true);
    try {
      const url = token
        ? `/api/reports/${resultId}/pdf?token=${encodeURIComponent(token)}`
        : `/api/reports/${resultId}/pdf`;
      const response = await fetch(url);
      if (!response.ok) return;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = pdfFileName(report.assessmentName);
      link.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: reportTheme.pageBackground }}
      >
        <Loader2 size={28} className="animate-spin text-[#2563EB]" />
        <p className="text-sm font-medium text-[#64748B]">Loading report…</p>
      </main>
    );
  }

  if (!hasResultId || !report) {
    const Icon = hasResultId ? FileX2 : FileWarning;
    return (
      <main
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 p-6"
        style={{ backgroundColor: reportTheme.pageBackground }}
      >
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-8 py-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <Icon size={22} className="text-rose-500" />
          </div>
          <p className="text-base font-semibold text-[#0F172A]">
            {hasResultId ? "Report not found" : "Report id missing"}
          </p>
          <p className="text-sm text-[#64748B]">
            {hasResultId
              ? "This report may have been removed, or the link is no longer valid."
              : "No report id was provided in the URL."}
          </p>
          {!isCandidate && (
            <Link
              href={backHref}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] px-4 py-2 text-sm font-medium text-[#2563EB] transition hover:bg-[#EFF6FF]"
            >
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: reportTheme.pageBackground }}
    >
      {/* Fixed header — stays in place; only the document viewport below scrolls */}
      <div className="shrink-0 border-b border-[#E2E8F0] bg-white px-4 py-4 shadow-sm md:px-10">
        <div className="mx-auto max-w-6xl space-y-3">
          {!isCandidate && (
            <Link
              href={backHref}
              className="group inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 -mx-2 text-sm font-medium text-[#2563EB] transition hover:bg-[#EFF6FF]"
            >
              <ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
              {backLabel}
            </Link>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#0F172A]">Report Preview</h1>
              <p className="mt-0.5 truncate text-sm text-[#64748B]">
                {[report.candidateName, report.assessmentName].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isCandidate && (
                <Link
                  href={`/candidate/reports/${resultId}/submissions${token ? `?token=${encodeURIComponent(token)}` : ""}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <ListChecks size={14} />
                  View Submission
                </Link>
              )}
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>

          {report.submissionType && report.submissionType !== "NORMAL" && (
            <SubmissionTypeBanner submissionType={report.submissionType} />
          )}
        </div>
      </div>

      {/* Scrollable document viewport — the "pages" scroll up within the fixed backdrop */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-10 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-10 overflow-x-auto [&_.report-page]:overflow-hidden [&_.report-page]:rounded-xl [&_.report-page]:shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] [&_.report-page]:ring-1 [&_.report-page]:ring-black/5">
            <ReportDocument report={report} completedDate={completedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
