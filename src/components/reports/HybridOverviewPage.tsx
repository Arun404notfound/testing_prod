"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

// Manual bullet rows, not <ul>/list-disc — leftover from the old html2canvas PDF
// pipeline (see CompetencyReportPage.tsx); no longer required but renders correctly.
function BulletList({
  items,
  ink,
  body,
}: {
  items: { label: string; description: string }[];
  ink: string;
  body: string;
}) {
  return (
    <div className="mt-8 max-w-2xl">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3" style={{ marginBottom: 16 }}>
          <p className="text-sm leading-relaxed">
            <span className="font-bold" style={{ color: ink }}>
              {item.label}:{" "}
            </span>
            <span style={{ color: body }}>{item.description}</span>
          </p>
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
        <h2 className="font-extrabold leading-[0.95] tracking-tight" style={{ color: theme.ink, fontSize: "4.5rem" }}>
          <span className="block">About</span>
          <span className="block">This</span>
          <span className="block">Report</span>
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: theme.ink }}>
          This report combines knowledge checks with psychometric-style signals where applicable. Section scores
          reflect knowledge domains; trait scores summarize self-report and forced-choice components.
        </p>

        <BulletList items={items} ink={theme.ink} body={theme.body} />
      </section>
    </div>
  );
}
