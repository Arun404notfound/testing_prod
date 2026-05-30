"use client";

import type { ReportPayload, ReportTraitScoreRow } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

// --- helpers ----------------------------------------------------------------

function attrScore(trait: ReportTraitScoreRow): number {
  if (!trait.maxScore) return 0;
  return Math.round(Math.min(10, (trait.score / trait.maxScore) * 10) * 10) / 10;
}

const PDP_PRIORITIES = [
  {
    title: "Priority 1: Placeholder Development Area",
    bullets: [
      "Placeholder action — will be populated via API",
      "Placeholder action — will be populated via API",
      "Placeholder action — will be populated via API",
    ],
  },
  {
    title: "Priority 2: Placeholder Development Area",
    bullets: [
      "Placeholder action — will be populated via API",
      "Placeholder action — will be populated via API",
      "Placeholder action — will be populated via API",
    ],
  },
  {
    title: "Priority 3: Placeholder Development Area",
    bullets: [
      "Placeholder action — will be populated via API",
      "Placeholder action — will be populated via API",
      "Placeholder action — will be populated via API",
    ],
  },
];

// --- main page --------------------------------------------------------------

export function PsychometricStrengthsScorecard({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const traits = report.traitScores;
  // Sort traits by their display score (same formula as engine) to derive rankings
  const withScore = traits.map((t) => ({ ...t, displayScore: attrScore(t) }));
  const topStrengths = [...withScore].sort((a, b) => b.displayScore - a.displayScore).slice(0, 5);
  const devPriorities = [...withScore].sort((a, b) => a.displayScore - b.displayScore).slice(0, 5);

  return (
    <section className="mt-6 space-y-6 p-2">
      {/* Top Strengths & Development Priorities — calculated */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="mb-4 text-base font-bold" style={{ color: theme.primary }}>
          Top Strengths &amp; Development Priorities
        </h3>
        {traits.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Strengths */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#10B981]">Top Strengths</p>
              <ol className="space-y-1.5">
                {topStrengths.map((t, i) => (
                  <li key={t.trait} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold text-[#065F46]">
                      {i + 1}
                    </span>
                    <span className="text-[#374151]">
                      {t.trait}
                      <span className="ml-2 text-xs text-[#9CA3AF]">({attrScore(t).toFixed(1)}/10)</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            {/* Development Priorities */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">
                Development Priorities
              </p>
              <ol className="space-y-1.5">
                {devPriorities.map((t, i) => (
                  <li key={t.trait} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-xs font-bold text-[#92400E]">
                      {i + 1}
                    </span>
                    <span className="text-[#374151]">
                      {t.trait}
                      <span className="ml-2 text-xs text-[#9CA3AF]">({attrScore(t).toFixed(1)}/10)</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No trait data available to derive strengths and priorities.</p>
        )}
      </div>

      {/* Complete Attribute Scorecard — calculated */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="mb-4 text-base font-bold" style={{ color: theme.primary }}>
          Complete Attribute Scorecard
        </h3>
        {traits.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="py-2 pl-1 pr-4 text-left text-xs font-semibold uppercase text-[#6B7280]">
                  Attribute
                </th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase text-[#6B7280]">Raw Score</th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase text-[#6B7280]">Max</th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase text-[#6B7280]">%</th>
                <th className="py-2 pr-1 text-right text-xs font-semibold uppercase text-[#6B7280]">
                  Score (0–10)
                </th>
              </tr>
            </thead>
            <tbody>
              {traits.map((t) => (
                <tr key={`${t.factor}-${t.trait}`} className="border-t border-[#F1F5F9]">
                  <td className="py-2 pl-1 pr-4 text-[#374151]">
                    <span className="font-medium">{t.trait}</span>
                    <span className="ml-2 text-xs text-[#9CA3AF]">{t.factor}</span>
                  </td>
                  <td className="py-2 pr-4 text-right text-[#1F2937]">{t.score}</td>
                  <td className="py-2 pr-4 text-right text-[#1F2937]">{t.maxScore}</td>
                  <td className="py-2 pr-4 text-right text-[#1F2937]">{Math.round(t.percent)}%</td>
                  <td className="py-2 pr-1 text-right font-semibold text-[#1F2937]">
                    {attrScore(t).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No attribute data available for this assessment.</p>
        )}
      </div>

      {/* Personal Development Plan — placeholder */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="mb-4 text-base font-bold" style={{ color: theme.primary }}>
          Personal Development Plan
        </h3>
        <div className="space-y-4">
          {PDP_PRIORITIES.map((p) => (
            <div key={p.title}>
              <p className="mb-1.5 text-sm font-semibold text-[#1F2937]">{p.title}</p>
              <ul className="space-y-0.5">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-[#475569]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#60A5FA]" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs italic text-[#9CA3AF]">
          * Development plan content is a placeholder and will be populated via API.
        </p>
      </div>
    </section>
  );
}
