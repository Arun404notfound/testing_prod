"use client";

import type { ReportPayload, ReportFactorAggregate, ReportCompetencyScore } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

// --- cover info helpers -----------------------------------------------------

function InfoCell({ label, value, muted }: { label: string; value: string; muted: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-[#1F2937]">{value}</p>
    </div>
  );
}

// --- helpers ----------------------------------------------------------------

function competencyLabel(band: string): string {
  if (band === "Exceptional" || band === "Strong") return "Key Strength";
  if (band === "Moderate") return "Strong Capability";
  return "Development Area";
}

function competencyLabelColor(label: string): { bg: string; text: string } {
  if (label === "Key Strength") return { bg: "#ECFDF5", text: "#065F46" };
  if (label === "Strong Capability") return { bg: "#EFF6FF", text: "#1E40AF" };
  return { bg: "#FFF7ED", text: "#9A3412" };
}

function factorScore(f: ReportFactorAggregate): number {
  return f.scaledScore != null ? Math.round(f.scaledScore * 100) / 10 : (f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) / 10 : 0);
}

// --- sub-components ---------------------------------------------------------

function CompetencySnapshotRow({ competency }: { competency: ReportCompetencyScore }) {
  const label = competencyLabel(competency.band);
  const colors = competencyLabelColor(label);
  const score = competency.scaledScore.toFixed(1);
  return (
    <tr className="border-t border-[#E5E7EB]">
      <td className="py-2 pr-4 text-sm font-medium text-[#1F2937]">{competency.competencyName}</td>
      <td className="py-2 pr-4 text-sm font-bold text-[#1F2937]">{score} / 10</td>
      <td className="py-2">
        <span
          className="rounded-full px-3 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {label}
        </span>
      </td>
    </tr>
  );
}

function BigFiveBar({
  factor,
  score,
  max = 10,
  accentColor,
}: {
  factor: string;
  score: number;
  max?: number;
  accentColor: string;
}) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-[#374151]">{factor}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: accentColor }}
        />
      </div>
      <span className="w-10 text-right text-sm font-bold text-[#1F2937]">{score.toFixed(1)}</span>
    </div>
  );
}

// --- main page --------------------------------------------------------------

export function PsychometricGlancePage({
  report,
  completedDate,
}: {
  report: ReportPayload;
  completedDate: string;
}) {
  const { theme, logoUrl } = useReportTheme();

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
    <section className="space-y-5 p-2">
      {/* Cover header — replaces standalone CoverPage */}
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-6 py-5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mb-4 max-h-12 max-w-[160px] object-contain"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
          Psychometric Assessment Report
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#1F2937]">{report.assessmentName}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCell label="Candidate" value={report.candidateName} muted={theme.muted} />
          <InfoCell label="Role" value={report.candidateRole || "—"} muted={theme.muted} />
          <InfoCell label="Client" value={report.tenantName ?? "—"} muted={theme.muted} />
          <InfoCell label="Date" value={completedDate} muted={theme.muted} />
        </div>
      </div>

      <p className="px-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#6B7280]">
        Your Personality at a Glance
      </p>

      {/* Competency Snapshot */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
          Competency Snapshot
        </h3>
        {competencies.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr>
                <th className="py-1 pr-4 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Competency</th>
                <th className="py-1 pr-4 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Score</th>
                <th className="py-1 text-left text-xs font-semibold uppercase text-[#9CA3AF]">Category</th>
              </tr>
            </thead>
            <tbody>
              {competencies.map((c) => (
                <CompetencySnapshotRow key={c.competencyId} competency={c} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No competency data available.</p>
        )}
      </div>

      {/* Big Five Personality Profile */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
          Big Five Personality Profile
        </h3>
        {sortedFactors.length > 0 ? (
          <div className="space-y-3">
            {sortedFactors.map((f) => (
              <BigFiveBar
                key={f.factor}
                factor={f.factor}
                score={factorScore(f)}
                accentColor={theme.accent}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No Big Five factor data available.</p>
        )}
      </div>

      {/* Personality Archetype — placeholder */}
      <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#1E40AF]">
          Personality Archetype
        </p>
        <p className="text-base font-bold text-[#1E3A8A]">The Influential Connector</p>
        <p className="mt-2 text-sm leading-relaxed text-[#1E40AF]">
          You naturally build relationships, engage others, and create positive interactions. You tend to be energetic,
          expressive, and comfortable in social environments. Your profile suggests strong communication capabilities
          and emotional balance, while greater structure and planning may further enhance performance.
        </p>
        <p className="mt-2 text-xs italic text-[#3B82F6]">
          * Archetype description is a placeholder and will be populated via API.
        </p>
      </div>
    </section>
  );
}
