import type { ReactNode } from "react";
import type { ReportPayload } from "@/lib/report-data";
import { resolveReportLayout } from "@/lib/report-layout";
import { ReportPageShell } from "@/components/reports/ReportPageShell";
import { ReportThemeProvider } from "@/components/reports/report-theme-context";
import { CoverPage } from "@/components/reports/CoverPage";
import { FactorScoresPage } from "@/components/reports/FactorScoresPage";
import { PsychometricGlancePage } from "@/components/reports/PsychometricGlancePage";
import { CompetencyReportPage } from "@/components/reports/CompetencyReportPage";
import { CompetencyExecutiveSummaryPage } from "@/components/reports/CompetencyExecutiveSummaryPage";
import { ReportInterpretationPage } from "@/components/reports/ReportInterpretationPage";
import { HybridOverviewPage } from "@/components/reports/HybridOverviewPage";
import { ReportTemplatePlaceholderPage } from "@/components/reports/ReportTemplatePlaceholderPage";

/** How many `.report-page` sections one module's body stack renders (cover excluded) —
 *  used both to number a standalone report and, for a combined Program report, to work
 *  out the running page offset before any module actually renders. Must stay in lockstep
 *  with buildModuleReportSections below. */
export function computeModulePageCount(report: ReportPayload): number {
  const layoutKind = resolveReportLayout(report.reportTemplateType, report.assessmentType);
  switch (layoutKind) {
    case "psychometric_trait":
    case "triad_forced_choice":
    case "hybrid":
      // glance/overview page + (radar + executive summary + interpretation + score overview) + one per competency
      return 1 + 4 + report.competencyScores.length;
    case "placeholder":
      return 1;
    case "technical_skills":
    default:
      return 1;
  }
}

/**
 * One module's body stack (no cover) — the template-specific pages for a single
 * `ReportPayload`. Shared by the standalone `ReportDocument` (pageOffset 0, its own
 * totalPages) and `ProgramReportDocument` (a running pageOffset/totalPages across every
 * module), so a Program report's per-module pages are pixel-identical to that module's
 * own standalone report, just renumbered to run continuously through the combined doc.
 */
export function buildModuleReportSections(
  report: ReportPayload,
  { footerMeta, pageOffset, totalPages }: { footerMeta: string; pageOffset: number; totalPages: number },
): ReactNode {
  // Radar chart, executive summary and the ranked score list each get their
  // own full page — sharing one autoFit page previously forced the chart down
  // to 260px and could shrink-transform the whole page unevenly if it ran
  // long, which is what made the section feel cramped/misaligned. Splitting
  // them out lets the radar chart render at full size and every page follow
  // the same un-scaled heading/body rhythm as the rest of the report.
  const renderCompetencyStack = (startPage: number) => {
    if (report.competencyScores.length === 0) return null;

    return (
      <>
        {/*
          Executive Summary — spans two pages (radar/cohort comparison, then
          strengths + focus areas) but reads as one section: same "Executive
          Summary" title on both, matching the client-agreed report structure
          (Executive Summary → Report Interpretation → competency-wise pages).
        */}
        <ReportPageShell footerMeta={footerMeta} pageNumber={startPage} totalPages={totalPages}>
          <CompetencyReportPage
            competencies={report.competencyScores}
            detailCompetencies={[]}
            heading="Executive Summary"
            showScoreOverview={false}
            radarHeight={440}
          />
        </ReportPageShell>
        <ReportPageShell footerMeta={footerMeta} pageNumber={startPage + 1} totalPages={totalPages}>
          <CompetencyExecutiveSummaryPage report={report} />
        </ReportPageShell>
        <ReportPageShell footerMeta={footerMeta} pageNumber={startPage + 2} totalPages={totalPages} autoFit>
          <ReportInterpretationPage />
        </ReportPageShell>
        <ReportPageShell footerMeta={footerMeta} pageNumber={startPage + 3} totalPages={totalPages}>
          <CompetencyReportPage
            competencies={report.competencyScores}
            detailCompetencies={[]}
            showRadar={false}
          />
        </ReportPageShell>
        {report.competencyScores.map((competency, index) => (
          <ReportPageShell
            key={competency.competencyId}
            footerMeta={footerMeta}
            pageNumber={startPage + 4 + index}
            totalPages={totalPages}
            autoFit
          >
            <CompetencyReportPage
              competencies={report.competencyScores}
              detailCompetencies={[competency]}
              showRadar={false}
              showScoreOverview={false}
              detailIndexOffset={index}
            />
          </ReportPageShell>
        ))}
      </>
    );
  };

  const renderMcqStack = () => (
    <ReportPageShell footerMeta={footerMeta} pageNumber={pageOffset + 1} totalPages={totalPages}>
      <FactorScoresPage report={report} />
    </ReportPageShell>
  );

  const renderLikertStack = () => (
    <>
      <ReportPageShell footerMeta={footerMeta} pageNumber={pageOffset + 1} totalPages={totalPages}>
        <PsychometricGlancePage report={report} />
      </ReportPageShell>
      {renderCompetencyStack(pageOffset + 2)}
    </>
  );

  const renderTriadStack = () => (
    <>
      <ReportPageShell footerMeta={footerMeta} pageNumber={pageOffset + 1} totalPages={totalPages}>
        <FactorScoresPage report={report} />
      </ReportPageShell>
      {renderCompetencyStack(pageOffset + 2)}
    </>
  );

  const renderHybridStack = () => (
    <>
      <ReportPageShell footerMeta={footerMeta} pageNumber={pageOffset + 1} totalPages={totalPages}>
        <HybridOverviewPage report={report} />
      </ReportPageShell>
      {renderCompetencyStack(pageOffset + 2)}
    </>
  );

  // Unnumbered, same as the standalone report — this template is a "coming soon"
  // placeholder, not a real page count worth exposing in a combined Program report either.
  const renderPlaceholderStack = () => (
    <ReportPageShell footerMeta={footerMeta}>
      <div className="p-8">
        <ReportTemplatePlaceholderPage reportTemplateType={report.reportTemplateType} />
      </div>
    </ReportPageShell>
  );

  const layoutKind = resolveReportLayout(report.reportTemplateType, report.assessmentType);
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
}

/**
 * The full stack of `.report-page` sections for one report — cover plus the
 * template-specific body pages. Shared by the on-screen preview (rendered
 * inside a scrollable viewport) and the print-only route that headless
 * Chrome converts straight to PDF, so both always show the same document.
 */
export function ReportDocument({ report, completedDate }: { report: ReportPayload; completedDate: string }) {
  // Running footer is the same across every page of every layout — matches
  // the reference report's consistent per-page chrome. There's no running
  // header any more; each page's own SectionHeading stands in for it.
  const footerMeta = [report.candidateName, report.tenantName, completedDate].filter(Boolean).join(" · ");

  return (
    <ReportThemeProvider branding={report.tenantBranding}>
      {/* Cover is unnumbered (no footerMeta/pageNumber props), matching the
          reference report's distinct, chrome-free cover page. It's still page 1 of the
          exported PDF; body pages restart their own "Page X of N" count after it. */}
      <ReportPageShell>
        <CoverPage report={report} completedDate={completedDate} />
      </ReportPageShell>
      {buildModuleReportSections(report, { footerMeta, pageOffset: 0, totalPages: computeModulePageCount(report) })}
    </ReportThemeProvider>
  );
}
