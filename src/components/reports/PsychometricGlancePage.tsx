"use client";

import type { ReportPayload, ReportFactorAggregate, ReportCompetencyScore } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

// --- helpers ----------------------------------------------------------------

function competencyLabel(band: string): string {
  if (band === "Exceptional" || band === "Strong") return "Key Strength";
  if (band === "Moderate") return "Strong Capability";
  return "Development Area";
}

function factorScore(f: ReportFactorAggregate): number {
  return f.scaledScore != null ? Math.round(f.scaledScore * 100) / 10 : (f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) / 10 : 0);
}

// --- sub-components ---------------------------------------------------------

function CompetencySnapshotRow({ competency, hairline, ink, body }: { competency: ReportCompetencyScore; hairline: string; ink: string; body: string }) {
  const label = competencyLabel(competency.band);
  const score = competency.scaledScore.toFixed(1);
  return (
    <tr className="border-t" style={{ borderColor: hairline }}>
      <td className="py-2.5 pr-4 text-sm font-medium" style={{ color: ink }}>{competency.competencyName}</td>
      <td className="py-2.5 pr-4 text-sm font-bold" style={{ color: ink }}>{score} / 10</td>
      <td className="py-2.5 text-sm" style={{ color: body }}>{label}</td>
    </tr>
  );
}

function BigFiveBar({
  factor,
  score,
  max = 10,
  accentColor,
  trackColor,
  inkColor,
}: {
  factor: string;
  score: number;
  max?: number;
  accentColor: string;
  trackColor: string;
  inkColor: string;
}) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-sm" style={{ color: inkColor }}>{factor}</span>
      <div style={{ height: 10, flex: 1, overflow: "hidden", borderRadius: 9999, backgroundColor: trackColor }}>
        <div style={{ height: 10, width: `${pct}%`, borderRadius: 9999, backgroundColor: accentColor }} />
      </div>
      <span className="w-10 text-right text-sm font-bold" style={{ color: inkColor }}>{score.toFixed(1)}</span>
    </div>
  );
}

// --- main page --------------------------------------------------------------

export function PsychometricGlancePage({
  report,
}: {
  report: ReportPayload;
}) {
  const { theme } = useReportTheme();

  const competencies = report.competencyScores;
  const factors = report.factorAggregates;

  const BIG_FIVE_ORDER = [
    "Extraversion",
    "Agreeableness",
    "Conscientiousness",
    "Openness to Experience",
    "Emotional Stability",
    "Openness",
  ];
  const sortedFactors = [...factors].sort((a, b) => {
    const ai = BIG_FIVE_ORDER.findIndex((n) => a.factor.toLowerCase().startsWith(n.toLowerCase().slice(0, 6)));
    const bi = BIG_FIVE_ORDER.findIndex((n) => b.factor.toLowerCase().startsWith(n.toLowerCase().slice(0, 6)));
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <section>
      <h2 className="text-2xl font-bold" style={{ color: theme.ink }}>
        Your Personality at a Glance
      </h2>

      {/* Competency Snapshot */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
          Competency Snapshot
        </h3>
        {competencies.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr>
                <th className="py-1 pr-4 text-left text-xs font-semibold uppercase" style={{ color: theme.body }}>Competency</th>
                <th className="py-1 pr-4 text-left text-xs font-semibold uppercase" style={{ color: theme.body }}>Score</th>
                <th className="py-1 text-left text-xs font-semibold uppercase" style={{ color: theme.body }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {competencies.map((c) => (
                <CompetencySnapshotRow key={c.competencyId} competency={c} hairline={theme.hairline} ink={theme.ink} body={theme.body} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm" style={{ color: theme.body }}>No competency data available.</p>
        )}
      </div>

      {/* Big Five Personality Profile */}
      <div className="mt-8">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
          Big Five Personality Profile
        </h3>
        {sortedFactors.length > 0 ? (
          <div className="flex flex-col gap-3">
            {sortedFactors.map((f) => (
              <BigFiveBar
                key={f.factor}
                factor={f.factor}
                score={factorScore(f)}
                accentColor={theme.accent}
                trackColor={theme.trackBackground}
                inkColor={theme.ink}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: theme.body }}>No Big Five factor data available.</p>
        )}
      </div>

      {/* Personality Archetype — placeholder */}
      <div className="mt-8 border-l-4 pl-4" style={{ borderColor: theme.accent }}>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
          Personality Archetype
        </p>
        <p className="text-base font-bold" style={{ color: theme.ink }}>The Influential Connector</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.body }}>
          You naturally build relationships, engage others, and create positive interactions. You tend to be energetic,
          expressive, and comfortable in social environments. Your profile suggests strong communication capabilities
          and emotional balance, while greater structure and planning may further enhance performance.
        </p>
        <p className="mt-2 text-xs italic" style={{ color: theme.body }}>
          * Archetype description is a placeholder and will be populated via API.
        </p>
      </div>
    </section>
  );
}
