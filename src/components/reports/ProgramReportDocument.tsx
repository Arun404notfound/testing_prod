import { Fragment } from "react";
import type { ProgramReportPayload } from "@/lib/program-report-data";
import { ReportPageShell } from "@/components/reports/ReportPageShell";
import { ReportThemeProvider } from "@/components/reports/report-theme-context";
import { useReportTheme } from "@/components/reports/report-theme-context";
import { SectionHeading, CornerTick } from "@/components/reports/SectionHeading";
import { REPORT_DESIGN_COLORS } from "@/components/reports/report-theme";
import { reportTypography } from "@/components/reports/report-typography";
import { buildModuleReportSections, computeModulePageCount } from "@/components/reports/ReportDocument";

const C = REPORT_DESIGN_COLORS;

const COMPOSITION_LABELS: Record<ProgramReportPayload["compositionType"], string> = {
  PSYCHOMETRIC: "Psychometric Program",
  TECHNICAL: "Technical Program",
  SURVEY: "Survey Program",
  MIXED: "Combined Program",
};

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ ...reportTypography.h4, color: C.body, letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ ...reportTypography.h2, marginTop: "0.35rem", color: C.ink }}>{value}</p>
    </div>
  );
}

/** Program-level cover — mirrors CoverPage.tsx's visual language (top bar, logo,
 *  eyebrow, meta grid, disclaimer notice) but titles on the Program itself and
 *  lists every module instead of one assessment's competency count. No fabricated
 *  cross-module score — just each module's own name, type and (where numeric) score. */
function ProgramCoverPage({ program, completedDate }: { program: ProgramReportPayload; completedDate: string }) {
  const { logoUrl, disclaimerText } = useReportTheme();
  const eyebrowLabel = COMPOSITION_LABELS[program.compositionType] ?? "Program Report";
  const subtitle = `A combined report covering all ${program.modules.length} module${program.modules.length === 1 ? "" : "s"} of this program, in completion order.`;

  const metaRows: { label: string; value: string }[] = [
    { label: "Report for", value: program.candidateName },
    { label: "Date", value: completedDate },
    ...(program.candidateRole ? [{ label: "Role", value: program.candidateRole }] : []),
    ...(program.tenantName ? [{ label: "Client", value: program.tenantName }] : []),
  ];

  return (
    <div className="relative flex flex-col" style={{ minHeight: "250mm" }}>
      <div className="absolute -left-10 -right-10 -top-10 flex h-2" aria-hidden>
        <div style={{ flex: 1, backgroundColor: C.ink }} />
        <div style={{ width: "18%", backgroundColor: C.accentStripe }} />
      </div>

      <div className="relative flex items-center gap-3 pt-6" style={{ zIndex: 1 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-9 max-w-[140px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span style={{ height: 16, width: 1, backgroundColor: C.hairline }} />
        <span style={{ ...reportTypography.h4, color: C.body, letterSpacing: "0.12em" }}>ASSESSMENT REPORT</span>
      </div>

      <div className="relative flex flex-col text-left" style={{ zIndex: 1, marginTop: "3rem" }}>
        <p style={{ ...reportTypography.h4, color: C.accent, letterSpacing: "0.1em" }}>{eyebrowLabel.toUpperCase()}</p>
        <h1 style={{ ...reportTypography.display, fontSize: "3.5rem", lineHeight: 1.05, color: C.ink, marginTop: "0.6rem", maxWidth: "26rem" }}>
          {program.programTitle}
        </h1>
        <p style={{ ...reportTypography.body, color: C.body, marginTop: "1rem", maxWidth: "34rem" }}>{subtitle}</p>

        <div style={{ marginTop: "2.25rem", borderTop: `1px solid ${C.hairline}`, paddingTop: "1.75rem" }}>
          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            {metaRows.map((row) => (
              <MetaCell key={row.label} label={row.label.toUpperCase()} value={row.value} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <p style={{ ...reportTypography.h4, color: C.body, letterSpacing: "0.08em" }}>MODULES IN THIS PROGRAM</p>
          <div style={{ marginTop: "0.75rem" }} className="space-y-2">
            {program.modules.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-between"
                style={{ borderBottom: i < program.modules.length - 1 ? `1px solid ${C.hairline}` : "none", paddingBottom: "0.5rem" }}
              >
                <div className="flex items-baseline gap-2">
                  <span style={{ ...reportTypography.bodyXSmall, color: C.domainLabel }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ ...reportTypography.body, color: C.ink, fontWeight: 600 }}>{m.assessmentName}</span>
                </div>
                {m.assessmentType === "KNOWLEDGE_MCQ" && (
                  <span style={{ ...reportTypography.dataSmall, color: C.accent }}>{Math.round(m.overallScore)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {disclaimerText && (
        <div
          className="relative"
          style={{ zIndex: 1, marginTop: "2.5rem", backgroundColor: C.noticeBg, border: `1px solid ${C.noticeBorder}`, padding: "1rem 1.25rem" }}
        >
          <CornerTick top left />
          <CornerTick top left={false} />
          <CornerTick top={false} left />
          <CornerTick top={false} left={false} />
          <p style={{ ...reportTypography.h4, color: C.eyebrow, letterSpacing: "0.08em" }}>Interpretation Notice</p>
          <p style={{ ...reportTypography.bodyXSmall, color: C.body, marginTop: "0.4rem" }}>{disclaimerText}</p>
        </div>
      )}
    </div>
  );
}

/** One full-page section break between modules — a plain "Module N of M" marker so the
 *  reader always knows which module's pages follow, since each module's own body stack
 *  carries no such framing on its own (it's identical to its standalone report). */
function ModuleDividerPage({
  index,
  total,
  moduleTitle,
  footerMeta,
  pageNumber,
  totalPages,
}: {
  index: number;
  total: number;
  moduleTitle: string;
  footerMeta: string;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <ReportPageShell footerMeta={footerMeta} pageNumber={pageNumber} totalPages={totalPages} centerContent>
      <SectionHeading eyebrow={`MODULE ${index} OF ${total}`} title={moduleTitle} />
    </ReportPageShell>
  );
}

export function ProgramReportDocument({ program, completedDate }: { program: ProgramReportPayload; completedDate: string }) {
  const footerMeta = [program.candidateName, program.tenantName, completedDate].filter(Boolean).join(" · ");

  // Two passes: first work out how many physical pages the whole document will run
  // (1 divider + each module's own page count), then render with a running page
  // number that continues across every module instead of each one restarting at 1.
  const moduleTotals = program.modules.map((m) => 1 + computeModulePageCount(m));
  const grandTotal = moduleTotals.reduce((sum, n) => sum + n, 0);

  let runningOffset = 0;
  const sections = program.modules.map((module, i) => {
    const dividerPageNumber = runningOffset + 1;
    const moduleOffset = runningOffset + 1;
    runningOffset += moduleTotals[i];

    return (
      <Fragment key={module.id}>
        <ModuleDividerPage
          index={i + 1}
          total={program.modules.length}
          moduleTitle={module.assessmentName}
          footerMeta={footerMeta}
          pageNumber={dividerPageNumber}
          totalPages={grandTotal}
        />
        {buildModuleReportSections(module, { footerMeta, pageOffset: moduleOffset, totalPages: grandTotal })}
      </Fragment>
    );
  });

  return (
    <ReportThemeProvider branding={program.tenantBranding}>
      <ReportPageShell>
        <ProgramCoverPage program={program} completedDate={completedDate} />
      </ReportPageShell>
      {sections}
    </ReportThemeProvider>
  );
}
