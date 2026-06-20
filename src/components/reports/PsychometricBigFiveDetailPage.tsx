"use client";

import type { ReportPayload, ReportTraitScoreRow, ReportFactorAggregate } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

function displayAttrScore(trait: ReportTraitScoreRow): number {
  if (!trait.maxScore) return 0;
  return Math.round(Math.min(10, (trait.score / trait.maxScore) * 10) * 10) / 10;
}

// --- helpers ----------------------------------------------------------------

function factorScore(f: ReportFactorAggregate): number {
  return f.scaledScore != null ? Math.round(f.scaledScore * 100) / 10 : (f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) / 10 : 0);
}

function factorScoreFromPercent(percent: number): number {
  return Math.round(percent) / 10;
}

// --- sub-components ---------------------------------------------------------

function FactorCard({
  factor,
  traits,
  accentColor,
}: {
  factor: ReportFactorAggregate;
  traits: ReportTraitScoreRow[];
  accentColor: string;
}) {
  const score = factorScore(factor);
  const pct = Math.min(100, (score / 10) * 100);

  const factorTraits = traits.filter(
    (t) => t.factor.toLowerCase() === factor.factor.toLowerCase(),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#F8FAFC] px-5 py-3">
        <h4 className="font-semibold text-[#0F172A]">{factor.factor}</h4>
        <div className="flex items-center gap-2">
          <div className="relative h-2.5 w-28 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: accentColor }}
            />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">{score.toFixed(1)}</span>
          <span className="text-xs text-[#94A3B8]">/ 10</span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Placeholder description */}
        <p className="text-sm leading-relaxed text-[#475569]">
          Placeholder description for {factor.factor}. This narrative text will be populated via the report content
          API. It will describe the candidate&apos;s standing on this factor and the implications for workplace
          behaviour.
        </p>

        {/* Attribute table — calculated */}
        {factorTraits.length > 0 && (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-1 pr-4 text-left text-xs text-[#9CA3AF]">Attribute</th>
                  <th className="py-1 pr-4 text-right text-xs text-[#9CA3AF]">Raw</th>
                  <th className="py-1 pr-4 text-right text-xs text-[#9CA3AF]">%</th>
                  <th className="py-1 text-right text-xs text-[#9CA3AF]">Score</th>
                </tr>
              </thead>
              <tbody>
                {factorTraits.map((t) => {
                  const score = displayAttrScore(t);
                  return (
                    <tr key={t.trait} className="border-t border-[#F1F5F9]">
                      <td className="py-1.5 pr-4 text-[#374151]">{t.trait}</td>
                      <td className="py-1.5 pr-4 text-right text-[#0F172A]">{t.score}</td>
                      <td className="py-1.5 pr-4 text-right text-[#0F172A]">{Math.round(t.percent)}%</td>
                      <td className="py-1.5 text-right font-semibold text-[#0F172A]">{score.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Strengths & Watchouts — placeholder */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#10B981]">Strengths</p>
            <ul className="space-y-0.5 text-xs text-[#374151]">
              <li className="flex items-start gap-1">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                Placeholder — will be populated via API
              </li>
              <li className="flex items-start gap-1">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                Placeholder — will be populated via API
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F59E0B]">Watchouts</p>
            <ul className="space-y-0.5 text-xs text-[#374151]">
              <li className="flex items-start gap-1">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                Placeholder — will be populated via API
              </li>
              <li className="flex items-start gap-1">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                Placeholder — will be populated via API
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- main page --------------------------------------------------------------

export function PsychometricBigFiveDetailPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const factors = report.factorAggregates;
  const traits = report.traitScores;

  const BIG_FIVE_ORDER = [
    "Extraversion",
    "Agreeableness",
    "Conscientiousness",
    "Openness",
    "Emotional Stability",
  ];

  const sortedFactors = [...factors].sort((a, b) => {
    const ai = BIG_FIVE_ORDER.findIndex((n) =>
      a.factor.toLowerCase().startsWith(n.toLowerCase().slice(0, 5)),
    );
    const bi = BIG_FIVE_ORDER.findIndex((n) =>
      b.factor.toLowerCase().startsWith(n.toLowerCase().slice(0, 5)),
    );
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <section className="space-y-5 p-2">
      <h3 className="text-base font-bold" style={{ color: theme.primary }}>
        Big Five Factors
      </h3>
      {sortedFactors.length > 0 ? (
        sortedFactors.map((f) => (
          <FactorCard key={f.factor} factor={f} traits={traits} accentColor={theme.accent} />
        ))
      ) : (
        <p className="text-sm text-[#9CA3AF]">No Big Five factor data available for this assessment.</p>
      )}
    </section>
  );
}
