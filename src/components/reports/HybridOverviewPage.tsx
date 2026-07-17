"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function HybridOverviewPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const attemptResponses = Array.isArray(report.attemptResponses) ? report.attemptResponses : [];
  const competencyScores = Array.isArray(report.competencyScores) ? report.competencyScores : [];
  const hasLikert = attemptResponses.some((r) => r.kind === "likert");
  const hasTriad = attemptResponses.some((r) => r.kind === "triad");
  return (
    <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
      <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
        Hybrid assessment overview
      </h3>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: theme.secondary }}>
        This report combines knowledge checks with psychometric-style signals where applicable. Section scores reflect
        knowledge domains; trait scores summarize self-report and forced-choice components.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm" style={{ color: theme.secondary }}>
        <li>Overall score: blended index across included modules.</li>
        <li>Section table: includes knowledge and rating-based sections as labeled.</li>
        {hasLikert ? <li>Likert-style items contributed to trait and competency scores.</li> : null}
        {hasTriad ? <li>Triad selections contributed to trait and competency scores.</li> : null}
      </ul>

      {(hasLikert || hasTriad) && competencyScores.length > 0 ? (
        <div className="mt-6 border-t pt-5" style={{ borderColor: theme.border }}>
          <p className="text-sm font-semibold" style={{ color: theme.primary }}>
            Likert / triad profile signals (competency level)
          </p>
          <div className="mt-4">
            {competencyScores.map((c) => {
              const pct = Number.isFinite(c.percent) ? c.percent : 0;
              return (
                <div key={c.competencyId} className="mb-4 last:mb-0">
                  <div className="flex h-5 items-center justify-between text-xs leading-5">
                    <span>{c.competencyName}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#e5e7eb" }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
