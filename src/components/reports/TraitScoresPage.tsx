"use client";

import type { ReportTraitScoreRow } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function traitCategoryLabel(percent: number): string {
  if (percent <= 34) return "Low";
  if (percent <= 64) return "Moderate";
  if (percent <= 84) return "High";
  return "Very High";
}

export function TraitScoresPage({
  traits,
  heading,
}: {
  traits: ReportTraitScoreRow[];
  heading: string;
}) {
  const { theme } = useReportTheme();
  if (traits.length === 0) return null;
  return (
    <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
      <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
        {heading}
      </h3>
      <table className="mt-4 w-full text-left text-sm">
        <thead style={{ color: theme.muted }}>
          <tr>
            <th className="py-2 pr-2">Factor</th>
            <th className="py-2 pr-2">Trait / attribute</th>
            <th className="py-2 pr-2">Score</th>
            <th className="py-2 pr-2">Max</th>
            <th className="py-2 pr-2">%</th>
            <th className="py-2">Category</th>
          </tr>
        </thead>
        <tbody>
          {traits.map((t) => {
            const pct = Number.isFinite(t.percent) ? t.percent : 0;
            const cat = traitCategoryLabel(pct);
            return (
              <tr key={`${t.factor}-${t.trait}`} className="border-t" style={{ borderColor: theme.border }}>
                <td className="py-2 pr-2 font-medium">{t.factor}</td>
                <td className="py-2 pr-2">{t.trait}</td>
                <td className="py-2 pr-2">{t.score}</td>
                <td className="py-2 pr-2">{t.maxScore}</td>
                <td className="py-2 pr-2">{pct}%</td>
                <td className="py-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: theme.accentLight,
                      color: theme.accent,
                    }}
                  >
                    {pct}% — {cat}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs" style={{ color: theme.muted }}>
        Categories: 0–34 Low · 35–64 Moderate · 65–84 High · 85–100 Very High
      </p>
    </section>
  );
}
