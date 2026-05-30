"use client";

import type { ReportPayload } from "@/lib/report-data";
import type { ReportThemePalette } from "./report-theme";
import { useReportTheme } from "./report-theme-context";

function ReportList({ theme, title, items }: { theme: ReportThemePalette; title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className="rounded-md border p-4"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.subtleBackground,
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm" style={{ color: theme.secondary }}>
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function PsychometricProfilePage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  return (
    <>
      <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
        <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
          Psychometric profile summary
        </h3>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: theme.secondary }}>
          This profile summarizes self-reported ratings mapped to organizational factors. Scores are aggregated from
          item-level responses after polarity adjustment. Use alongside interviews and role context.
        </p>
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold" style={{ color: theme.primary }}>
            Factor score summary
          </p>
          {(Array.isArray(report.factorAggregates) ? report.factorAggregates : []).length === 0 ? (
            <p className="text-sm" style={{ color: theme.muted }}>
              No factor aggregates available.
            </p>
          ) : (
            (Array.isArray(report.factorAggregates) ? report.factorAggregates : []).map((f) => {
              const pct = f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) : 0;
              return (
                <div key={f.factor} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{f.factor}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full" style={{ backgroundColor: "#e5e7eb" }}>
                    <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.accent }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <ReportList theme={theme} title="Strengths" items={Array.isArray(report.strengths) ? report.strengths : []} />
        <ReportList
          theme={theme}
          title="Areas of concern"
          items={Array.isArray(report.areasOfConcern) ? report.areasOfConcern : []}
        />
      </section>

      <section className="mt-6 rounded-md border p-6" style={{ borderColor: theme.border, backgroundColor: theme.subtleBackground }}>
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
          Interpretation note
        </h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.secondary }}>
          Self-report measures reflect perceived tendencies, not fixed traits. Avoid using scores in isolation for
          high-stakes decisions; combine with performance data, references, and structured interviews.
        </p>
      </section>
    </>
  );
}
