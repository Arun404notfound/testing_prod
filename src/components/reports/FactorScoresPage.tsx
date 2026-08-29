"use client";

import type { ReportPayload, ReportFactorAggregate } from "@/lib/report-data";
import { REPORT_DESIGN_COLORS } from "./report-theme";
import { reportTypography } from "./report-typography";
import { SectionHeading } from "./SectionHeading";

const C = REPORT_DESIGN_COLORS;

/** Solid, saturated band colors — matches CompetencyReportPage's palette. */
function bandColor(band: string | null): string {
  switch (band) {
    case "Exceptional":
    case "Proficient":
      return "#047857"; // emerald-700
    case "Strong":
    case "Intermediate":
      return "#1D4ED8"; // blue-700
    case "Moderate":
      return "#B45309"; // amber-700
    case "Low":
    case "Developing":
      return "#C2410C"; // orange-700
    case "Expert":
      return "#6D28D9"; // violet-700
    default:
      return "#334155"; // slate-700
  }
}

function FactorRow({ factor }: { factor: ReportFactorAggregate }) {
  const hasScaled = factor.scaledScore != null;
  const displayScore = hasScaled ? (factor.scaledScore as number) : factor.percent / 10;
  const color = factor.band ? bandColor(factor.band) : C.accent;

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "0.75rem 0", borderBottom: `1px solid ${C.hairline}` }}>
      <span style={{ flex: "0 0 34%", ...reportTypography.bodySmall, fontWeight: 500, color: C.ink, paddingRight: 12 }}>
        {factor.displayName ?? factor.factor}
      </span>
      <span style={{ flex: 1, position: "relative", height: 8, backgroundColor: C.hairline, borderRadius: 4, marginRight: 16 }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (displayScore / 10) * 100)}%`, backgroundColor: color, borderRadius: 4 }} />
      </span>
      <span style={{ width: 60, textAlign: "right", ...reportTypography.dataSmall, color: C.ink }}>
        {hasScaled ? (factor.scaledScore as number).toFixed(1) : `${factor.percent}%`}
      </span>
      {factor.band && (
        <span style={{ width: 90, textAlign: "right", ...reportTypography.badge, letterSpacing: "0.06em", color }}>{factor.band}</span>
      )}
    </div>
  );
}

/**
 * Factor-level scale scores only — deliberately does not render
 * `ReportFactorAggregate.attributes` (the subscale/trait-level breakdown).
 * Replaces the old AttributeScoresTable, which listed every subscale trait
 * in a table; the client asked for scale-level scores without that detail.
 */
export function FactorScoresPage({ report }: { report: ReportPayload }) {
  const factors = [...report.factorAggregates].sort(
    (a, b) => (b.scaledScore ?? b.percent / 10) - (a.scaledScore ?? a.percent / 10),
  );

  if (factors.length === 0) {
    return <p style={{ ...reportTypography.bodySmall, color: C.body }}>No trait scores available.</p>;
  }

  return (
    <div>
      <SectionHeading eyebrow="Section 01" title="Trait scores" />
      <p style={{ ...reportTypography.body, color: C.body, marginTop: "0.5rem", marginBottom: "1.5rem" }}>
        Factor-level scores derived from the candidate&rsquo;s responses.
      </p>
      {factors.map((f) => (
        <FactorRow key={f.factor} factor={f} />
      ))}
    </div>
  );
}
