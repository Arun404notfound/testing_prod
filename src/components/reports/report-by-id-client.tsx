"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { ReportPayload } from "@/lib/report-data";
import { normalizeReportPayload } from "@/lib/normalize-report-payload";
import { resolveReportLayout } from "@/lib/report-layout";
import { ReportTemplatePlaceholderPage } from "@/components/reports/ReportTemplatePlaceholderPage";
import { CoverPage } from "@/components/reports/CoverPage";
import { DisclaimerPage } from "@/components/reports/DisclaimerPage";
import { ForcedChoiceProfilePage } from "@/components/reports/ForcedChoiceProfilePage";
import { HybridOverviewPage } from "@/components/reports/HybridOverviewPage";
import { PsychometricProfilePage } from "@/components/reports/PsychometricProfilePage";
import {
  QuestionResponsesPage,
  type QuestionResponseBlock,
} from "@/components/reports/QuestionResponsesPage";
import { ReportPageShell } from "@/components/reports/ReportPageShell";
import { SectionScoresPage } from "@/components/reports/SectionScoresPage";
import { StrengthsAreasPage } from "@/components/reports/StrengthsAreasPage";
import { SummaryPage } from "@/components/reports/SummaryPage";
import { TraitScoresPage } from "@/components/reports/TraitScoresPage";
import { reportTheme } from "@/components/reports/report-theme";
import { CompetencyReportPage } from "@/components/reports/CompetencyReportPage";
import { ReportThemeProvider } from "@/components/reports/report-theme-context";

type QuestionReviewItem = ReportPayload["groupedQuestionReview"][string][number]["items"][number];

function pdfFileName(assessmentName: string) {
  const slug = assessmentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "assessment"}-report.pdf`;
}

function buildQuestionPages(report: ReportPayload): QuestionResponseBlock[][] {
  const blocks: QuestionResponseBlock[] = [];
  for (const [section, categories] of Object.entries(report.groupedQuestionReview)) {
    if (!Array.isArray(categories)) continue;
    blocks.push({ kind: "section", section });
    for (const categoryBlock of categories) {
      if (!categoryBlock || typeof categoryBlock !== "object" || !Array.isArray(categoryBlock.items)) continue;
      blocks.push({ kind: "category", section, category: String(categoryBlock.category ?? "") });
      for (const item of categoryBlock.items) {
        if (!item || typeof item !== "object") continue;
        blocks.push({
          kind: "question",
          section,
          category: String(categoryBlock.category ?? ""),
          question: item as QuestionReviewItem,
        });
      }
    }
  }

  const pages: QuestionResponseBlock[][] = [];
  let currentPage: QuestionResponseBlock[] = [];
  let usedUnits = 0;
  const maxUnitsPerPage = 14;

  const units = (b: QuestionResponseBlock) => {
    if (b.kind === "section") return 2;
    if (b.kind === "category") return 1;
    return 3;
  };

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const blockUnits = units(block);

    if (usedUnits + blockUnits > maxUnitsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      usedUnits = 0;
    }

    currentPage.push(block);
    usedUnits += blockUnits;

    if (block.kind === "section") {
      const next = blocks[i + 1];
      if (next && usedUnits + units(next) > maxUnitsPerPage && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        usedUnits = 0;
      }
    }
  }

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
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

  const questionPages = useMemo(() => (report ? buildQuestionPages(report) : []), [report]);

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

  const layout = resolveReportLayout(report.reportTemplateType, report.assessmentType);
  const hasMcqReview = questionPages.length > 0;

  const renderMcqStack = () => (
    <>
      <ReportPageShell>
        <CoverPage report={report} completedDate={completedDate} variant="mcq" />
      </ReportPageShell>
      <ReportPageShell>
        <SummaryPage report={report} title="Summary" />
      </ReportPageShell>
      <ReportPageShell>
        <SectionScoresPage report={report} heading="Skill / section score summary" />
      </ReportPageShell>
      <ReportPageShell>
        <StrengthsAreasPage report={report} />
      </ReportPageShell>
      {hasMcqReview
        ? questionPages.map((pageBlocks, index) => (
            <ReportPageShell key={`responses-page-${index}`}>
              <QuestionResponsesPage pageBlocks={pageBlocks} />
            </ReportPageShell>
          ))
        : null}
      <ReportPageShell>
        <DisclaimerPage />
      </ReportPageShell>
    </>
  );

  const renderLikertStack = () => (
    <>
      <ReportPageShell>
        <CoverPage report={report} completedDate={completedDate} variant="psychometric" />
      </ReportPageShell>
      <ReportPageShell>
        <SummaryPage report={report} title="Psychometric summary" />
      </ReportPageShell>
      {report.competencyScores && report.competencyScores.length > 0 ? (
        <ReportPageShell>
          <CompetencyReportPage competencies={report.competencyScores} heading="Competency Profile" />
        </ReportPageShell>
      ) : (
        <ReportPageShell>
          <PsychometricProfilePage report={report} />
        </ReportPageShell>
      )}
      <ReportPageShell>
        <TraitScoresPage traits={report.traitScores} heading="Trait / attribute score table" />
      </ReportPageShell>
      <ReportPageShell>
        <DisclaimerPage />
      </ReportPageShell>
    </>
  );

  const renderTriadStack = () => (
    <>
      <ReportPageShell>
        <CoverPage report={report} completedDate={completedDate} variant="triad" />
      </ReportPageShell>
      <ReportPageShell>
        <SummaryPage report={report} title="Forced-choice summary" />
      </ReportPageShell>
      {report.competencyScores && report.competencyScores.length > 0 ? (
        <ReportPageShell>
          <CompetencyReportPage competencies={report.competencyScores} heading="Competency Profile" />
        </ReportPageShell>
      ) : (
        <ReportPageShell>
          <ForcedChoiceProfilePage report={report} />
        </ReportPageShell>
      )}
      <ReportPageShell>
        <TraitScoresPage traits={report.traitScores} heading="Trait / attribute score table" />
      </ReportPageShell>
      <ReportPageShell>
        <DisclaimerPage />
      </ReportPageShell>
    </>
  );

  const renderPlaceholderStack = () => (
    <>
      <ReportPageShell>
        <CoverPage report={report} completedDate={completedDate} variant="mcq" />
      </ReportPageShell>
      <ReportPageShell>
        <ReportTemplatePlaceholderPage reportTemplateType={report.reportTemplateType} />
      </ReportPageShell>
      <ReportPageShell>
        <DisclaimerPage />
      </ReportPageShell>
    </>
  );

  const renderHybridStack = () => (
    <>
      <ReportPageShell>
        <CoverPage report={report} completedDate={completedDate} variant="hybrid" />
      </ReportPageShell>
      <ReportPageShell>
        <HybridOverviewPage report={report} />
      </ReportPageShell>
      <ReportPageShell>
        <SummaryPage report={report} title="Overall score summary" />
      </ReportPageShell>
      <ReportPageShell>
        <SectionScoresPage report={report} heading="Section score summary" />
      </ReportPageShell>
      {report.traitScores.length > 0 ? (
        <ReportPageShell>
          <TraitScoresPage traits={report.traitScores} heading="Trait score summary" />
        </ReportPageShell>
      ) : null}
      {hasMcqReview
        ? questionPages.map((pageBlocks, index) => (
            <ReportPageShell key={`hybrid-mcq-${index}`}>
              <QuestionResponsesPage pageBlocks={pageBlocks} />
            </ReportPageShell>
          ))
        : null}
      <ReportPageShell>
        <StrengthsAreasPage report={report} />
      </ReportPageShell>
      <ReportPageShell>
        <DisclaimerPage />
      </ReportPageShell>
    </>
  );

  return (
    <main className="min-h-screen px-4 py-8 md:px-10" style={{ backgroundColor: reportTheme.pageBackground }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: reportTheme.primary }}>
            Report Preview
          </h1>
          <div className="flex items-center gap-5">
            <Link href={backHref} className="text-sm font-medium hover:underline" style={{ color: reportTheme.accent }}>
              {backLabel}
            </Link>
            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-70"
              style={{ backgroundColor: reportTheme.primary }}
            >
              {downloading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div ref={pagesRef} className="space-y-6">
          {report ? (
            <ReportThemeProvider branding={report.tenantBranding}>
              {layout === "psychometric_trait"
                ? renderLikertStack()
                : layout === "triad_forced_choice"
                  ? renderTriadStack()
                  : layout === "hybrid"
                    ? renderHybridStack()
                    : layout === "placeholder"
                      ? renderPlaceholderStack()
                      : renderMcqStack()}
            </ReportThemeProvider>
          ) : null}
        </div>
      </div>
    </main>
  );
}
