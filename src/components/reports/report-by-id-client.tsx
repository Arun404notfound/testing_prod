"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { ReportPayload } from "@/lib/report-data";
import { normalizeReportPayload } from "@/lib/normalize-report-payload";
import { resolveReportLayout } from "@/lib/report-layout";
import { ReportPageShell } from "@/components/reports/ReportPageShell";
import { reportTheme } from "@/components/reports/report-theme";
import { ReportThemeProvider } from "@/components/reports/report-theme-context";
import { AttributeScoresTable } from "@/components/reports/AttributeScoresTable";
import { PsychometricGlancePage } from "@/components/reports/PsychometricGlancePage";
import { CompetencyReportPage } from "@/components/reports/CompetencyReportPage";
import { HybridOverviewPage } from "@/components/reports/HybridOverviewPage";
import { ReportTemplatePlaceholderPage } from "@/components/reports/ReportTemplatePlaceholderPage";


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
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const isCandidate = pathname.startsWith("/candidate/reports");
  const backHref = "/admin/reports";
  const backLabel = "Back to reports";

  const hasResultId = Boolean(resultId);
  const pagesRef = useRef<HTMLDivElement>(null);
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
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pageNodes.length; i += 1) {
        const node = pageNodes[i];
        const canvas = await html2canvas(node, {
          scale: Math.max(2, window.devicePixelRatio || 1),
          backgroundColor: "#ffffff",
          useCORS: true,
        });

        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      }

      pdf.save(pdfFileName(report.assessmentName));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="fixed inset-0 z-40 p-8" style={{ backgroundColor: reportTheme.pageBackground, color: reportTheme.secondary }}>
        Loading...
      </main>
    );
  }

  if (!hasResultId) {
    return (
      <main className="fixed inset-0 z-40 p-8" style={{ backgroundColor: reportTheme.pageBackground, color: reportTheme.incorrect }}>
        Report id missing.
      </main>
    );
  }

  if (!report) {
    return (
      <main className="fixed inset-0 z-40 p-8" style={{ backgroundColor: reportTheme.pageBackground, color: reportTheme.incorrect }}>
        Report not found.
      </main>
    );
  }

  const renderAttributeScoresStack = () => (
    <ReportPageShell>
      <div className="space-y-6 p-8">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Attribute Scores</h2>
          <p className="mt-1 text-sm text-[#64748B]">Raw score range: 5 – 17</p>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">1 + (raw − 5) × 9 / 12</p>
        </div>
        <AttributeScoresTable report={report} />
      </div>
    </ReportPageShell>
  );

  const renderCompetencyStack = () => {
    if (report.competencyScores.length === 0) return null;

    const heading = report.jobRoleName ? `${report.jobRoleName} — Competency Profile` : "Competency Profile";
    return (
      <>
        <ReportPageShell>
          <div className="p-8">
            <CompetencyReportPage
              competencies={report.competencyScores}
              detailCompetencies={[]}
              heading={heading}
            />
          </div>
        </ReportPageShell>
        {report.competencyScores.map((competency, index) => (
          <ReportPageShell key={competency.competencyId}>
            <div className="p-8">
              <CompetencyReportPage
                competencies={report.competencyScores}
                detailCompetencies={[competency]}
                showOverview={false}
                detailIndexOffset={index}
              />
            </div>
          </ReportPageShell>
        ))}
      </>
    );
  };

  const renderMcqStack = renderAttributeScoresStack;

  const renderLikertStack = () => (
    <>
      <ReportPageShell>
        <div className="p-8">
          <PsychometricGlancePage report={report} completedDate={completedDate} />
        </div>
      </ReportPageShell>
      {renderCompetencyStack()}
    </>
  );

  const renderTriadStack = () => (
    <>
      {renderAttributeScoresStack()}
      {renderCompetencyStack()}
    </>
  );

  const renderHybridStack = () => (
    <>
      <ReportPageShell>
        <div className="p-8">
          <HybridOverviewPage report={report} />
        </div>
      </ReportPageShell>
      {renderCompetencyStack()}
    </>
  );

  const renderPlaceholderStack = () => (
    <ReportPageShell>
      <div className="p-8">
        <ReportTemplatePlaceholderPage reportTemplateType={report.reportTemplateType} />
      </div>
    </ReportPageShell>
  );

  const layoutKind = resolveReportLayout(report.reportTemplateType, report.assessmentType);
  const renderStack = () => {
    switch (layoutKind) {
      case "psychometric_trait":
        return renderLikertStack();
      case "triad_forced_choice":
        return renderTriadStack();
      case "hybrid":
        return renderHybridStack();
      case "placeholder":
        return renderPlaceholderStack();
      case "technical_skills":
      default:
        return renderMcqStack();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: reportTheme.pageBackground }}
    >
      {/* Fixed header — stays in place; only the document viewport below scrolls */}
      <div
        className="shrink-0 border-b px-4 py-4 md:px-10"
        style={{ borderColor: reportTheme.border, backgroundColor: reportTheme.cardBackground }}
      >
        <div className="mx-auto max-w-6xl space-y-3">
          {!isCandidate && (
            <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: reportTheme.accent }}>
              ← {backLabel}
            </Link>
          )}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold" style={{ color: reportTheme.primary }}>
              Report Preview
            </h1>
            <div className="flex items-center gap-2">
              {isCandidate && (
                <Link
                  href={`/candidate/reports/${resultId}/submissions${token ? `?token=${encodeURIComponent(token)}` : ""}`}
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

          {report.submissionType && report.submissionType !== "NORMAL" && (
            <SubmissionTypeBanner submissionType={report.submissionType} />
          )}
        </div>
      </div>

      {/* Scrollable document viewport — the "pages" scroll up within the fixed backdrop */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div ref={pagesRef} className="space-y-6 overflow-x-auto">
            {report ? (
              <ReportThemeProvider branding={report.tenantBranding}>
                {renderStack()}
              </ReportThemeProvider>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
