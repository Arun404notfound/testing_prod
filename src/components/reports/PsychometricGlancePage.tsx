"use client";

import type { ReportPayload, ReportFactorAggregate, ReportCompetencyScore } from "@/lib/report-data";
import { REPORT_DESIGN_COLORS } from "./report-theme";
import { reportTypography } from "./report-typography";
import { SectionHeading } from "./SectionHeading";

const C = REPORT_DESIGN_COLORS;

// --- helpers ----------------------------------------------------------------

function competencyLabel(band: string): string {
  if (band === "Exceptional" || band === "Strong") return "Key Strength";
  if (band === "Moderate") return "Strong Capability";
  return "Development Area";
}

/** Badge color per snapshot category — mirrors the band palette used on the competency detail pages. */
function categoryColor(label: string): string {
  if (label === "Key Strength") return "#047857"; // emerald-700
  if (label === "Strong Capability") return "#B45309"; // amber-700
  return "#B91C1C"; // red-700
}

function factorScore(f: ReportFactorAggregate): number {
  return f.scaledScore != null ? Math.round(f.scaledScore * 100) / 10 : (f.maxScore > 0 ? Math.round((f.score / f.maxScore) * 100) / 10 : 0);
}

// --- sub-components ---------------------------------------------------------

function CompetencySnapshotRow({ competency, hairline, ink }: { competency: ReportCompetencyScore; hairline: string; ink: string }) {
  const label = competencyLabel(competency.band);
  const score = competency.scaledScore.toFixed(1);
  const color = categoryColor(label);
  return (
    <tr style={{ borderTop: `1px solid ${hairline}` }}>
      <td style={{ ...reportTypography.tableCell, padding: "0.625rem 1rem 0.625rem 0", fontWeight: 500, color: ink }}>{competency.competencyName}</td>
      <td style={{ ...reportTypography.tableCellBold, padding: "0.625rem 1rem 0.625rem 0", color: ink }}>{score} / 10</td>
      <td style={{ padding: "0.625rem 0" }}>
        <span
          style={{
            ...reportTypography.badge,
            display: "inline-block",
            borderRadius: "9999px",
            padding: "0.25rem 0.75rem",
            backgroundColor: `${color}1A`,
            color,
          }}
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
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ ...reportTypography.bodySmall, width: "11rem", flexShrink: 0, color: inkColor }}>{factor}</span>
      <div style={{ height: 10, flex: 1, overflow: "hidden", borderRadius: 9999, backgroundColor: trackColor }}>
        <div style={{ height: 10, width: `${pct}%`, borderRadius: 9999, backgroundColor: accentColor }} />
      </div>
      <span style={{ ...reportTypography.dataSmall, width: "2.5rem", textAlign: "right", color: inkColor }}>{score.toFixed(1)}</span>
    </div>
  );
}

// --- main page --------------------------------------------------------------

export function PsychometricGlancePage({
  report,
}: {
  report: ReportPayload;
}) {
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
      <SectionHeading eyebrow="Section 01" title="Your personality at a glance" />

      {/* Competency Snapshot */}
      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ ...reportTypography.h3, marginBottom: "0.75rem", color: C.ink }}>
          Competency Snapshot
        </h3>
        {competencies.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...reportTypography.tableHeader, padding: "0.25rem 1rem 0.25rem 0", textAlign: "left", color: C.body }}>Competency</th>
                <th style={{ ...reportTypography.tableHeader, padding: "0.25rem 1rem 0.25rem 0", textAlign: "left", color: C.body }}>Score</th>
                <th style={{ ...reportTypography.tableHeader, padding: "0.25rem 0", textAlign: "left", color: C.body }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {competencies.map((c) => (
                <CompetencySnapshotRow key={c.competencyId} competency={c} hairline={C.hairline} ink={C.ink} />
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ ...reportTypography.bodySmall, color: C.body }}>No competency data available.</p>
        )}
      </div>

      {/* Big Five Personality Profile */}
      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ ...reportTypography.h3, marginBottom: "1rem", color: C.ink }}>
          Big Five Personality Profile
        </h3>
        {sortedFactors.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {sortedFactors.map((f) => (
              <BigFiveBar
                key={f.factor}
                factor={f.factor}
                score={factorScore(f)}
                accentColor={C.accent}
                trackColor={C.hairline}
                inkColor={C.ink}
              />
            ))}
          </div>
        ) : (
          <p style={{ ...reportTypography.bodySmall, color: C.body }}>No Big Five factor data available.</p>
        )}
      </div>

      {/* Personality Archetype — placeholder */}
      <div
        style={{
          marginTop: "2rem",
          backgroundColor: `${C.accent}0D`,
          border: `1px solid ${C.accent}33`,
          borderLeft: `4px solid ${C.accent}`,
          borderRadius: 8,
          padding: "1rem 1.25rem",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
        }}
      >
        <p style={{ ...reportTypography.h4, color: C.accent, marginBottom: "0.25rem" }}>
          Personality Archetype
        </p>
        <p style={{ ...reportTypography.dataMedium, color: C.ink }}>The Influential Connector</p>
        <p style={{ ...reportTypography.body, marginTop: "0.5rem", color: C.body }}>
          You naturally build relationships, engage others, and create positive interactions. You tend to be energetic,
          expressive, and comfortable in social environments. Your profile suggests strong communication capabilities
          and emotional balance, while greater structure and planning may further enhance performance.
        </p>
        <p style={{ ...reportTypography.bodyXSmall, marginTop: "0.5rem", fontStyle: "italic", color: C.body }}>
          * Archetype description is a placeholder and will be populated via API.
        </p>
      </div>
    </section>
  );
}
