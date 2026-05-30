"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function HybridOverviewPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const attemptResponses = Array.isArray(report.attemptResponses) ? report.attemptResponses : [];
  const factorAggregates = Array.isArray(report.factorAggregates) ? report.factorAggregates : [];
  const hasLikert = attemptResponses.some((r) => r.kind === "likert");
  const hasTriad = attemptResponses.some((r) => r.kind === "triad");
  const triadRows = attemptResponses.filter((r) => r.kind === "triad");
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
        {hasLikert ? <li>Likert-style items contributed to trait and factor aggregates.</li> : null}
        {hasTriad ? <li>Triad selections contributed to trait and factor aggregates.</li> : null}
      </ul>

      {(hasLikert || hasTriad) && factorAggregates.length > 0 ? (
        <div className="mt-6 border-t pt-5" style={{ borderColor: theme.border }}>
          <p className="text-sm font-semibold" style={{ color: theme.primary }}>
            Likert / triad profile signals (factor level)
          </p>
          <div className="mt-3 space-y-2">
            {factorAggregates.map((f) => {
              const pct = f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) : 0;
              return (
                <div key={f.factor}>
                  <div className="flex justify-between text-xs">
                    <span>{f.factor}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full" style={{ backgroundColor: "#e5e7eb" }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {triadRows.length > 0 ? (
        <div className="mt-6 border-t pt-5" style={{ borderColor: theme.border }}>
          <p className="text-sm font-semibold" style={{ color: theme.primary }}>
            Most / least (triad)
          </p>
          <table className="mt-2 w-full text-left text-xs">
            <thead style={{ color: theme.muted }}>
              <tr>
                <th className="py-1 pr-2">Group</th>
                <th className="py-1 pr-2">Most</th>
                <th className="py-1">Least</th>
              </tr>
            </thead>
            <tbody>
              {triadRows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: theme.border }}>
                  <td className="py-1 pr-2">{r.triadGroupTitle ?? "—"}</td>
                  <td className="py-1 pr-2">{r.mostStatement ?? "—"}</td>
                  <td className="py-1">{r.leastStatement ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
