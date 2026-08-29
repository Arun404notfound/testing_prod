"use client";

import type { ReportPayload } from "@/lib/report-data";
import { REPORT_DESIGN_COLORS } from "./report-theme";
import { useReportTheme } from "./report-theme-context";
import { reportTypography } from "./report-typography";
import { CornerTick } from "./SectionHeading";

const C = REPORT_DESIGN_COLORS;

/** Short, client-facing document-type eyebrow shown above the title —
 *  distinct from the generic "ASSESSMENT REPORT" brand-row tag next to the
 *  logo, so the two lines never repeat the same words. */
const DOC_TYPE_EYEBROW: Record<ReportPayload["reportTemplateType"], string> = {
  TECHNICAL_SKILLS_REPORT: "Technical Report",
  PSYCHOMETRIC_TRAIT_REPORT: "Psychometric Report",
  FORCED_CHOICE_REPORT: "Behavioural Report",
  HYBRID_REPORT: "Assessment Report",
  SALES_PROFILER_REPORT: "Sales Report",
  SALES_SIMULATION_REPORT: "Sales Report",
  CUSTOM: "Assessment Report",
};

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ ...reportTypography.h4, color: C.body, letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ ...reportTypography.h2, marginTop: "0.35rem", color: C.ink }}>{value}</p>
    </div>
  );
}

/** Universal cover page — the actual page 1 for every report layout kind. */
export function CoverPage({
  report,
  completedDate,
}: {
  report: ReportPayload;
  completedDate: string;
}) {
  // Only the logo and disclaimer copy stay tenant-specific here — every color
  // on this page is fixed (REPORT_DESIGN_COLORS), matching the client's
  // reference design exactly regardless of which tenant's report this is.
  const { logoUrl, disclaimerText } = useReportTheme();
  const hasJobRole = Boolean(report.jobRoleName);
  const subjectTitle = report.jobRoleName ?? report.assessmentName;
  const eyebrowLabel = hasJobRole ? "Competency Report" : DOC_TYPE_EYEBROW[report.reportTemplateType];
  const subtitle =
    report.competencyScores.length > 0
      ? `${report.competencyScores.length} competencies assessed, scored and benchmarked, with development actions for the areas of greatest impact.`
      : "Performance assessed and scored across every section of this report.";

  const metaRows: { label: string; value: string }[] = [
    { label: "Report for", value: report.candidateName },
    { label: "Date", value: completedDate },
    ...(report.candidateRole ? [{ label: "Role", value: report.candidateRole }] : []),
    ...(report.tenantName ? [{ label: "Client", value: report.tenantName }] : []),
  ];

  return (
    // Fixed minHeight, well short of the 297mm physical page (ReportPageShell's
    // own py-10 padding plus this already eats ~30mm — pushing this close to
    // 297mm leaves no slack and spills the notice box onto a second physical
    // page, which is exactly what happened at 277mm during redesign).
    <div className="relative flex flex-col" style={{ minHeight: "250mm" }}>
      {/*
        Full-bleed top bar — bleeds past ReportPageShell's own px-10/py-10
        padding via matching negative insets. Fixed ink/accent colors (see
        REPORT_DESIGN_COLORS), not the tenant's own theme — this matches the
        reference design's literal navy + red exactly, on every tenant.
      */}
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
        <h1 style={{ ...reportTypography.display, fontSize: "3.5rem", lineHeight: 1.05, color: C.ink, marginTop: "0.6rem", maxWidth: "22rem" }}>
          {subjectTitle}
        </h1>
        <p style={{ ...reportTypography.body, color: C.body, marginTop: "1rem", maxWidth: "34rem" }}>{subtitle}</p>

        <div style={{ marginTop: "2.25rem", borderTop: `1px solid ${C.hairline}`, paddingTop: "1.75rem" }}>
          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            {metaRows.map((row) => (
              <MetaCell key={row.label} label={row.label.toUpperCase()} value={row.value} />
            ))}
          </div>
        </div>
      </div>

      {disclaimerText && (
        <div
          className="relative"
          style={{
            zIndex: 1,
            marginTop: "5rem",
            backgroundColor: C.noticeBg,
            border: `1px solid ${C.noticeBorder}`,
            padding: "1rem 1.25rem",
          }}
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
