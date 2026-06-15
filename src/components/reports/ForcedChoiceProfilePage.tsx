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

export function ForcedChoiceProfilePage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const attemptResponses = Array.isArray(report.attemptResponses) ? report.attemptResponses : [];
  const triadRows = attemptResponses.filter((r) => r.kind === "triad");
  return (
    <>
      <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
        <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
          Forced-choice profile summary
        </h3>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: theme.secondary }}>
          Ipsative triads compare three statements within each group. Most and least selections drive trait-level
          scoring; the neutral statement receives a mid-range weight.
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
              const pct = f.scaledScore != null ? Math.round(f.scaledScore * 10) : (f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) : 0);
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

      {triadRows.length > 0 ? (
        <section className="mt-6 rounded-md border p-6" style={{ borderColor: theme.border }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
            Most / least response summary
          </h3>
          <table className="mt-3 w-full text-left text-sm">
            <thead style={{ color: theme.muted }}>
              <tr>
                <th className="py-2 pr-2">Group</th>
                <th className="py-2 pr-2">Most like me</th>
                <th className="py-2">Least like me</th>
              </tr>
            </thead>
            <tbody>
              {triadRows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: theme.border }}>
                  <td className="py-2 pr-2 font-medium">{r.triadGroupTitle ?? "—"}</td>
                  <td className="py-2 pr-2">{r.mostStatement ?? "—"}</td>
                  <td className="py-2">{r.leastStatement ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

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
          Forced-choice profiles are relative within each triad. They highlight trade-offs between statements rather
          than absolute standing. Validate with behavioral examples and role requirements.
        </p>
      </section>
    </>
  );
}
