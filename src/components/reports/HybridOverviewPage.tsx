"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

// Manual bullet rows, not <ul>/list-disc — leftover from the old html2canvas PDF
// pipeline (see CompetencyReportPage.tsx); no longer required but renders correctly.
function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <div className="mt-4 max-w-2xl">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2" style={{ marginBottom: 8 }}>
          <span style={{ marginTop: 7, height: 5, width: 5, borderRadius: 9999, backgroundColor: color, flexShrink: 0 }} />
          <span className="text-sm" style={{ color }}>{item}</span>
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
    "Overall score: blended index across included modules.",
    "Section table: includes knowledge and rating-based sections as labeled.",
    ...(hasLikert ? ["Likert-style items contributed to trait and competency scores."] : []),
    ...(hasTriad ? ["Triad selections contributed to trait and competency scores."] : []),
  ];

  return (
    <section>
      <h2 className="text-2xl font-bold" style={{ color: theme.ink }}>
        About This Report
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: theme.body }}>
        This report combines knowledge checks with psychometric-style signals where applicable. Section scores
        reflect knowledge domains; trait scores summarize self-report and forced-choice components.
      </p>

      <BulletList items={items} color={theme.body} />
    </section>
  );
}
