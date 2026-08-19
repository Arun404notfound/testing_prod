"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";
import { reportTypography } from "./report-typography";

/**
 * A stark black-and-white grid — deliberately monochrome (no accent tint)
 * to match this page's bold, high-contrast title treatment instead of the
 * colored cards used elsewhere in the report. The 1px ink-colored gap
 * between white cells reads as table rules without needing per-cell
 * borders, which would double up awkwardly at shared edges.
 */
function InfoGrid({
  items,
  ink,
  body,
}: {
  items: { label: string; description: string }[];
  ink: string;
  body: string;
}) {
  return (
    <div
      className="mt-8 max-w-2xl"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 1,
        backgroundColor: ink,
        border: `1px solid ${ink}`,
      }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ backgroundColor: "#fff", padding: "1.125rem 1.25rem" }}>
          <p style={{ ...reportTypography.bodyXSmall, color: body, letterSpacing: "0.05em" }}>
            {String(i + 1).padStart(2, "0")}
          </p>
          <p style={{ ...reportTypography.h3, marginTop: 6, color: ink }}>{item.label}</p>
          <p style={{ ...reportTypography.bodySmall, marginTop: 4, color: body }}>{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function HybridOverviewPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
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

  return (
    // Self-contained flex centering with a hardcoded mm floor — same technique as
    // CoverPage's disclaimer push. `ReportPageShell`'s own `centerContent` (a
    // `justify-center` on `.report-page-body`) only centers on screen: the print
    // route forces `.report-page-body` to `display: block !important` (needed
    // elsewhere to avoid flex-fragmentation corruption on tall pages), which
    // silently drops that centering and left this section pinned to the top of
    // the PDF page. This div is a plain descendant with no such class, so its
    // own `flex` survives print untouched, and the explicit minHeight (measured:
    // 297mm page − ~20mm header − ~26mm footer reserve − ~21mm body padding ≈
    // 230mm available) gives `justify-center` real room to work with.
    <div className="flex flex-1 flex-col justify-center" style={{ minHeight: "225mm" }}>
      <section>
        <h2 style={{ ...reportTypography.display, color: theme.ink }}>
          <span className="block">About</span>
          <span className="block">This</span>
          <span className="block">Report</span>
        </h2>
        <div className="mt-4 mb-6 h-px w-24" style={{ backgroundColor: theme.hairline }} />
        <p className="mt-4 max-w-2xl" style={{ ...reportTypography.body, color: theme.ink }}>
          This report combines knowledge checks with psychometric-style signals where applicable. Section scores
          reflect knowledge domains; trait scores summarize self-report and forced-choice components.
        </p>

        <InfoGrid items={items} ink={theme.ink} body={theme.body} />
      </section>
    </div>
  );
}
