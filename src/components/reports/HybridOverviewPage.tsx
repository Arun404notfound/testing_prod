"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function HybridOverviewPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const attemptResponses = Array.isArray(report.attemptResponses) ? report.attemptResponses : [];
  const hasLikert = attemptResponses.some((r) => r.kind === "likert");
  const hasTriad = attemptResponses.some((r) => r.kind === "triad");
  return (
    <section>
      <h2 className="text-2xl font-bold" style={{ color: theme.ink }}>
        About This Report
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: theme.body }}>
        This report combines knowledge checks with psychometric-style signals where applicable. Section scores
        reflect knowledge domains; trait scores summarize self-report and forced-choice components.
      </p>

      <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-sm" style={{ color: theme.body }}>
        <li>Overall score: blended index across included modules.</li>
        <li>Section table: includes knowledge and rating-based sections as labeled.</li>
        {hasLikert && <li>Likert-style items contributed to trait and competency scores.</li>}
        {hasTriad && <li>Triad selections contributed to trait and competency scores.</li>}
      </ul>
    </section>
  );
}
