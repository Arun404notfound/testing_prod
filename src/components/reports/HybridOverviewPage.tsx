import type { ReportPayload } from "@/lib/report-data";
import { REPORT_DESIGN_COLORS } from "./report-theme";
import { reportTypography } from "./report-typography";
import { SectionHeading } from "./SectionHeading";

const C = REPORT_DESIGN_COLORS;

/** Single framed 2x2 grid with internal hairline dividers, matching the
 *  reference exactly — not four separate cards with their own borders/gaps. */
function InfoGrid({ items }: { items: { label: string; description: string }[] }) {
  const cols = 2;
  const rowCount = Math.ceil(items.length / cols);
  return (
    <div className="mt-8 grid max-w-2xl grid-cols-2" style={{ border: `1px solid ${C.hairline}` }}>
      {items.map((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const isLastInRow = col === cols - 1 || i === items.length - 1;
        const isLastRow = row === rowCount - 1;
        return (
          <div
            key={i}
            style={{
              borderRight: isLastInRow ? "none" : `1px solid ${C.hairline}`,
              borderBottom: isLastRow ? "none" : `1px solid ${C.hairline}`,
              padding: "1.125rem 1.25rem",
            }}
          >
            <p style={{ ...reportTypography.h2, color: C.eyebrow }}>{String(i + 1).padStart(2, "0")}</p>
            <p style={{ ...reportTypography.h3, marginTop: 6, color: C.ink }}>{item.label}</p>
            <p style={{ ...reportTypography.bodySmall, marginTop: 4, color: C.body }}>{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function ContentsList({ rows }: { rows: { label: string; pages: string }[] }) {
  return (
    <div className="mt-10 max-w-2xl" style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: "1.25rem" }}>
      <p style={{ ...reportTypography.h4, color: C.eyebrow, letterSpacing: "0.08em" }}>Contents</p>
      <div className="mt-3 space-y-2.5">
        {rows.map((row, i) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <span style={{ ...reportTypography.bodySmall, color: C.ink }}>
              <span style={{ color: C.body }}>{String(i + 1).padStart(2, "0")}</span> &nbsp;{row.label}
            </span>
            <span style={{ ...reportTypography.bodySmall, color: C.body }}>{row.pages}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HybridOverviewPage({ report }: { report: ReportPayload }) {
  const attemptResponses = Array.isArray(report.attemptResponses) ? report.attemptResponses : [];
  const hasLikert = attemptResponses.some((r) => r.kind === "likert");
  const hasTriad = attemptResponses.some((r) => r.kind === "triad");

  const items = [
    { label: "Overall score", description: "Blended index across included modules." },
    { label: "Section table", description: "Includes knowledge and rating-based sections as labeled." },
    ...(hasLikert
      ? [{ label: "Likert-style items", description: "Contributed to trait and competency scores." }]
      : []),
    ...(hasTriad
      ? [{ label: "Triad selections", description: "Contributed to trait and competency scores." }]
      : []),
  ];

  // Mirrors renderHybridStack's exact page composition in ReportDocument.tsx —
  // this page (1) + Executive Summary (2-3) + How to read this report (4) +
  // Score overview (5) + one page per competency (6..5+N).
  const competencyCount = report.competencyScores.length;
  const contentsRows = [
    { label: "About this report", pages: "1" },
    { label: "Executive summary", pages: "2–3" },
    { label: "How to read this report", pages: "4" },
    { label: "Score overview", pages: "5" },
    ...(competencyCount > 0
      ? [{ label: "Competency detail, ranked", pages: competencyCount === 1 ? "6" : `6–${5 + competencyCount}` }]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <SectionHeading eyebrow="Section 01" title="About this report" />
      <p className="mt-4 max-w-2xl" style={{ ...reportTypography.body, color: C.body }}>
        This report combines knowledge checks with psychometric-style signals where applicable. Section scores
        reflect knowledge domains; trait scores summarize self-report and forced-choice components.
      </p>

      <InfoGrid items={items} />
      <ContentsList rows={contentsRows} />
    </div>
  );
}
