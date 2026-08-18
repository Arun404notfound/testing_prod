import type { ReportPayload } from "@/lib/report-data";
import { resolveReportLayout } from "@/lib/report-layout";
import { ReportPageShell } from "@/components/reports/ReportPageShell";
import { ReportThemeProvider } from "@/components/reports/report-theme-context";
import { CoverPage } from "@/components/reports/CoverPage";
import { FactorScoresPage } from "@/components/reports/FactorScoresPage";
import { PsychometricGlancePage } from "@/components/reports/PsychometricGlancePage";
import { CompetencyReportPage } from "@/components/reports/CompetencyReportPage";
import { CompetencyExecutiveSummaryPage } from "@/components/reports/CompetencyExecutiveSummaryPage";
import { HybridOverviewPage } from "@/components/reports/HybridOverviewPage";
import { ReportTemplatePlaceholderPage } from "@/components/reports/ReportTemplatePlaceholderPage";

/**
 * The full stack of `.report-page` sections for one report — cover plus the
 * template-specific body pages. Shared by the on-screen preview (rendered
 * inside a scrollable viewport) and the print-only route that headless
 * Chrome converts straight to PDF, so both always show the same document.
 */
export function ReportDocument({ report, completedDate }: { report: ReportPayload; completedDate: string }) {
  // Running header/footer are the same across every page of every layout —
  // matches the reference report's consistent per-page chrome.
  const footerMeta = [report.candidateName, report.tenantName, completedDate].filter(Boolean).join(" · ");
  const pageLabel = report.assessmentName;

  // Cover is unnumbered (no pageLabel/footerMeta/pageNumber props), matching the
  // reference report's distinct, chrome-free cover page. It's still page 1 of the
  // exported PDF; body pages restart their own "Page X of N" count after it.
  const renderCover = () => (
    <ReportPageShell hideHeaderLogo>
      <CoverPage report={report} completedDate={completedDate} />
    </ReportPageShell>
  );

  // Radar chart + executive summary share one auto-fit page (the chart alone
  // left a lot of unused whitespace below it); the ranked score list gets its
  // own page since it can run long. autoFit guarantees the combined page
  // never overflows/bleeds into the next sheet, shrinking it down if needed.
  const renderCompetencyStack = (pageOpts?: { startPage: number; totalPages: number }) => {
    if (report.competencyScores.length === 0) return null;

    const heading = report.jobRoleName ? `${report.jobRoleName} — Competency Profile` : "Competency Profile";
    return (
      <>
        <ReportPageShell
          pageLabel={pageLabel}
          footerMeta={footerMeta}
          pageNumber={pageOpts?.startPage}
          totalPages={pageOpts?.totalPages}
          autoFit
        >
          <CompetencyReportPage
            competencies={report.competencyScores}
            detailCompetencies={[]}
            heading={heading}
            showScoreOverview={false}
            radarHeight={260}
          />
          <CompetencyExecutiveSummaryPage report={report} />
        </ReportPageShell>
        <ReportPageShell
          pageLabel={pageLabel}
          footerMeta={footerMeta}
          pageNumber={pageOpts ? pageOpts.startPage + 1 : undefined}
          totalPages={pageOpts?.totalPages}
        >
          <CompetencyReportPage
            competencies={report.competencyScores}
            detailCompetencies={[]}
            heading={heading}
            showRadar={false}
          />
        </ReportPageShell>
        {report.competencyScores.map((competency, index) => (
          <ReportPageShell
            key={competency.competencyId}
            pageLabel={pageLabel}
            footerMeta={footerMeta}
            pageNumber={pageOpts ? pageOpts.startPage + 2 + index : undefined}
            totalPages={pageOpts?.totalPages}
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
    <ReportPageShell pageLabel={pageLabel} footerMeta={footerMeta} pageNumber={1} totalPages={1}>
      <FactorScoresPage report={report} />
    </ReportPageShell>
  );

  const renderLikertStack = () => {
    const totalPages = 1 + 2 + report.competencyScores.length; // glance page + (radar/summary + score overview) + one per competency
    return (
      <>
        <ReportPageShell pageLabel={pageLabel} footerMeta={footerMeta} pageNumber={1} totalPages={totalPages}>
          <PsychometricGlancePage report={report} />
        </ReportPageShell>
        {renderCompetencyStack({ startPage: 2, totalPages })}
      </>
    );
  };

  const renderTriadStack = () => {
    const totalPages = 1 + 2 + report.competencyScores.length; // factor scores + (radar/summary + score overview) + one per competency
    return (
      <>
        <ReportPageShell pageLabel={pageLabel} footerMeta={footerMeta} pageNumber={1} totalPages={totalPages}>
          <FactorScoresPage report={report} />
        </ReportPageShell>
        {renderCompetencyStack({ startPage: 2, totalPages })}
      </>
    );
  };

  const renderHybridStack = () => {
    const totalPages = 1 + 2 + report.competencyScores.length; // hybrid overview + (radar/summary + score overview) + one per competency
    return (
      <>
        <ReportPageShell pageLabel={pageLabel} footerMeta={footerMeta} pageNumber={1} totalPages={totalPages} centerContent>
          <HybridOverviewPage report={report} />
        </ReportPageShell>
        {renderCompetencyStack({ startPage: 2, totalPages })}
      </>
    );
  };

  const renderPlaceholderStack = () => (
    <ReportPageShell pageLabel={pageLabel} footerMeta={footerMeta}>
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
    <ReportThemeProvider branding={report.tenantBranding}>
      {renderCover()}
      {renderStack()}
    </ReportThemeProvider>
  );
}
