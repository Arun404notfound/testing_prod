"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { ReportPayload } from "@/lib/report-data";
import { normalizeReportPayload } from "@/lib/normalize-report-payload";
import { ReportPageShell } from "@/components/reports/ReportPageShell";
import { reportTheme } from "@/components/reports/report-theme";
import { ReportThemeProvider } from "@/components/reports/report-theme-context";
import { AttributeScoresTable } from "@/components/reports/AttributeScoresTable";


const SUBMISSION_META: Record<string, { label: string; detail: string; color: string; bg: string; border: string }> = {
  TIMED_OUT:      { label: "Timer Expired",         detail: "The assessment time limit was reached and the test was auto-submitted.",                                    color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  SIGNED_OUT:     { label: "Signed Out Mid-Test",   detail: "The candidate chose to sign out before completing the assessment. All saved answers were submitted.",       color: "#0D9488", bg: "#E6F7F1", border: "#BFDBFE" },
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

function pdfFileName(assessmentName: string) {
  const slug = assessmentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "assessment"}-report.pdf`;
}


export default function ReportByIdClient() {
  const { resultId } = useParams<{ resultId: string }>();
  const pathname = usePathname();
  const isCandidate = pathname.startsWith("/candidate/reports");
  const backHref = isCandidate ? "/candidate" : "/admin/reports";
  const backLabel = isCandidate ? "Back to my tests" : "Back to reports";

  const hasResultId = Boolean(resultId);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!hasResultId) return;
    (async () => {
      const response = await fetch(`/api/reports/${resultId}`);
      if (response.ok) {
        const normalized = normalizeReportPayload(await response.json());
        if (normalized) setReport(normalized);
      }
      setLoading(false);
    })();
  }, [hasResultId, resultId]);

  const completedDate = useMemo(() => {
    if (!report) return "-";
    const d = new Date(report.completedAt);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [report]);

  async function downloadPdf() {
    if (!pagesRef.current || !report) return;
    setDownloading(true);
    try {
      const pageNodes = Array.from(pagesRef.current.querySelectorAll<HTMLElement>(".report-page"));
      if (pageNodes.length === 0) return;

      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < pageNodes.length; i += 1) {
        const node = pageNodes[i];
        const canvas = await html2canvas(node, {
          scale: Math.max(2, window.devicePixelRatio || 1),
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const image = canvas.toDataURL("image/png");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        if (i > 0) pdf.addPage();
        pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
      }

      pdf.save(pdfFileName(report.assessmentName));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8" style={{ backgroundColor: reportTheme.pageBackground, color: reportTheme.secondary }}>
        Loading...
      </main>
    );
  }

  if (!hasResultId) {
    return (
      <main className="min-h-screen p-8" style={{ backgroundColor: reportTheme.pageBackground, color: reportTheme.incorrect }}>
        Report id missing.
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen p-8" style={{ backgroundColor: reportTheme.pageBackground, color: reportTheme.incorrect }}>
        Report not found.
      </main>
    );
  }

  const renderAttributeScoresStack = () => (
    <ReportPageShell>
      <div className="p-4 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Attribute Scores</h2>
          <p className="mt-1 text-sm text-[#64748B]">Raw score range: 5 – 17</p>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">1 + (raw − 5) × 9 / 12</p>
        </div>
        <AttributeScoresTable report={report} />
      </div>
    </ReportPageShell>
  );

  const renderMcqStack = renderAttributeScoresStack;
  const renderLikertStack = renderAttributeScoresStack;
  const renderTriadStack = renderAttributeScoresStack;
  const renderPlaceholderStack = renderAttributeScoresStack;
  const renderHybridStack = renderAttributeScoresStack;

  return (
    <main className="min-h-screen px-4 py-8 md:px-10" style={{ backgroundColor: reportTheme.pageBackground }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 space-y-3">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: reportTheme.accent }}>
            ← {backLabel}
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold" style={{ color: reportTheme.primary }}>
              Report Preview
            </h1>
            <div className="flex items-center gap-2">
              {isCandidate && (
                <Link
                  href={`/candidate/reports/${resultId}/submissions`}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-80"
                  style={{ borderColor: reportTheme.primary, color: reportTheme.primary }}
                >
                  View Submission
                </Link>
              )}
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-70"
                style={{ backgroundColor: reportTheme.primary }}
              >
                {downloading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>

        {report.submissionType && report.submissionType !== "NORMAL" && (
          <SubmissionTypeBanner submissionType={report.submissionType} />
        )}

        <div ref={pagesRef} className="space-y-6 overflow-x-auto">
          {report ? (
            <ReportThemeProvider branding={report.tenantBranding}>
              {renderAttributeScoresStack()}
            </ReportThemeProvider>
          ) : null}
        </div>
      </div>
    </main>
  );
}
