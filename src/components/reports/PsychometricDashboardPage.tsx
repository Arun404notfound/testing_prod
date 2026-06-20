"use client";

import type { ReportPayload, ReportTraitScoreRow, ReportCompetencyScore } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

// --- helpers ----------------------------------------------------------------

/** (raw / max) × 10 — mirrors the engine formula exactly. */
function displayAttrScore(trait: ReportTraitScoreRow): number {
  if (!trait.maxScore) return 0;
  return Math.round(Math.min(10, (trait.score / trait.maxScore) * 10) * 10) / 10;
}

function competencyLabel(band: string): string {
  if (band === "Exceptional" || band === "Strong") return "Key Strength";
  if (band === "Moderate") return "Strong Capability";
  return "Development Area";
}

function competencyColors(label: string): { bg: string; text: string; border: string } {
  if (label === "Key Strength") return { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" };
  if (label === "Strong Capability") return { bg: "#EFF6FF", text: "#1D4EDB", border: "#6EE7B7" };
  return { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" };
}

function formulaLabel(formula: string): string {
  switch (formula) {
    case "SIMPLE_AVERAGE": return "competency score = simple average of these";
    case "HIGHEST_ATTRIBUTE": return "competency score = highest attribute";
    case "LOWEST_ATTRIBUTE": return "competency score = lowest attribute";
    case "GEOMETRIC_MEAN": return "competency score = geometric mean of these";
    default: return "competency score = weighted average of these";
  }
}

// --- sub-components ---------------------------------------------------------

function CompetencyCard({
  competency,
  traits,
}: {
  competency: ReportCompetencyScore;
  traits: ReportTraitScoreRow[];
}) {
  const label = competencyLabel(competency.band);
  const colors = competencyColors(label);

  // For each mapped attribute, find its trait score (or null if missing)
  const attrRows = competency.attributes.map((attr) => {
    const match = traits.find(
      (t) =>
        t.trait.toLowerCase() === attr.name.toLowerCase() ||
        t.factor.toLowerCase() === attr.name.toLowerCase(),
    );
    return { name: attr.name, trait: match ?? null };
  });

  return (
    <div
      className="overflow-hidden rounded-xl border bg-white"
      style={{ borderColor: colors.border }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: colors.bg }}>
        <div>
          <h3 className="font-semibold text-[#0F172A]">{competency.competencyName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: colors.text }}>
            {competency.scaledScore.toFixed(1)}
          </span>
          <span className="text-sm text-[#94A3B8]">/ 10</span>
          <span
            className="ml-2 rounded-full px-3 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {label}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Placeholder description */}
        <p className="text-sm leading-relaxed text-[#475569]">
          {competency.competencyName} is a measured competency in this assessment. The narrative description for
          this competency will be populated from the report content API. Placeholder text is shown here to
          represent the layout and spacing of the final report.
        </p>

        {/* Attribute scores table — calculated using same formula as engine */}
        {attrRows.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Attribute Scores
              <span className="ml-2 normal-case font-normal text-[#CBD5E1]">
                ({formulaLabel(competency.scoringFormula)})
              </span>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="py-1 pr-4 text-left text-xs text-[#9CA3AF]">Attribute</th>
                  <th className="py-1 text-right text-xs text-[#9CA3AF]">Score / 10</th>
                </tr>
              </thead>
              <tbody>
                {attrRows.map(({ name, trait }) => (
                  <tr key={name} className="border-t border-[#F1F5F9]">
                    <td className="py-1.5 pr-4 text-[#374151]">{name}</td>
                    <td className="py-1.5 text-right font-semibold text-[#0F172A]">
                      {trait ? displayAttrScore(trait).toFixed(1) : <span className="text-[#CBD5E1]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attrRows.some(({ trait }) => !trait) && (
              <p className="mt-1 text-xs text-[#9CA3AF]">
                — No items for this attribute in the assessment
              </p>
            )}
          </div>
        )}

        {/* Likely Behaviours — placeholder */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Likely Behaviours</p>
          <ul className="space-y-0.5 text-sm text-[#475569]">
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#94A3B8]" />
              Placeholder behaviour description — will be populated via API
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#94A3B8]" />
              Placeholder behaviour description — will be populated via API
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#94A3B8]" />
              Placeholder behaviour description — will be populated via API
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- main page --------------------------------------------------------------

export function PsychometricDashboardPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const competencies = report.competencyScores;
  const traits = report.traitScores;

  return (
    <section className="space-y-6 p-2">
      {/* Executive Summary — placeholder content */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="mb-4 text-base font-bold" style={{ color: theme.primary }}>
          Executive Summary
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">What Stands Out</p>
            <ul className="space-y-1 text-sm text-[#374151]">
              {[
                "Placeholder strength — will be populated via API",
                "Placeholder strength — will be populated via API",
                "Placeholder strength — will be populated via API",
                "Placeholder strength — will be populated via API",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Development Focus</p>
            <ul className="space-y-1 text-sm text-[#374151]">
              {[
                "Placeholder development area — will be populated via API",
                "Placeholder development area — will be populated via API",
                "Placeholder development area — will be populated via API",
                "Placeholder development area — will be populated via API",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Competency Dashboard */}
      <div>
        <h3 className="mb-4 text-base font-bold" style={{ color: theme.primary }}>
          Competency Dashboard
        </h3>
        {competencies.length > 0 ? (
          <div className="space-y-4">
            {competencies.map((c) => (
              <CompetencyCard key={c.competencyId} competency={c} traits={traits} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No competency data available for this assessment.</p>
        )}
      </div>
    </section>
  );
}
