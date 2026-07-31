"use client";

import type { ReportPayload, ReportFactorAggregate } from "@/lib/report-data";
import type { ReportThemePalette } from "./report-theme";
import { useReportTheme } from "./report-theme-context";

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

// Plain nested block (no position:absolute, no Tailwind space-y) — see the same note
// in CompetencyReportPage.tsx; html2canvas mis-rasterizes those patterns.
function SegmentedBar({
  score,
  max = 10,
  segments = 5,
  color,
  trackColor,
}: {
  score: number;
  max?: number;
  segments?: number;
  color: string;
  trackColor: string;
}) {
  const segMax = max / segments;
  return (
    <div className="flex items-center" style={{ gap: 4, height: 14 }}>
      {Array.from({ length: segments }).map((_, i) => {
        const segStart = i * segMax;
        const filled = Math.max(0, Math.min(segMax, score - segStart));
        const pct = Math.round((filled / segMax) * 100);
        return (
          <div key={i} style={{ flex: 1, height: 14, overflow: "hidden", backgroundColor: trackColor, borderRadius: 2 }}>
            <div style={{ height: 14, width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
          </div>
        );
      })}
    </div>
  );
}

function FactorRow({ factor, theme }: { factor: ReportFactorAggregate; theme: ReportThemePalette }) {
  const hasScaled = factor.scaledScore != null;
  const displayScore = hasScaled ? factor.scaledScore as number : factor.percent / 10;
  const color = factor.band ? bandColor(factor.band) : theme.accent;

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="flex items-center gap-4" style={{ marginBottom: 6 }}>
        <span className="min-w-0 flex-1 text-base font-bold" style={{ color: theme.ink }}>
          {factor.displayName ?? factor.factor}
        </span>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          {hasScaled ? (
            <span className="text-sm font-bold" style={{ color: theme.ink }}>
              {(factor.scaledScore as number).toFixed(1)}<span className="text-xs font-normal" style={{ color: theme.body }}>/10</span>
            </span>
          ) : (
            <span className="text-sm font-bold" style={{ color: theme.ink }}>{factor.percent}%</span>
          )}
          {factor.band && (
            <span
              className="rounded-sm px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: color, color: theme.accentContrastText }}
            >
              {factor.band}
            </span>
          )}
        </span>
      </div>
      <SegmentedBar score={displayScore} color={color} trackColor={theme.trackBackground} />
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
  const { theme } = useReportTheme();
  const factors = [...report.factorAggregates].sort(
    (a, b) => (b.scaledScore ?? b.percent / 10) - (a.scaledScore ?? a.percent / 10),
  );

  if (factors.length === 0) {
    return <p className="text-sm italic" style={{ color: theme.body }}>No trait scores available.</p>;
  }

  return (
    <div>
      <div className="border-b-2 pb-2" style={{ borderColor: theme.ink, marginBottom: 24 }}>
        <h2 className="text-xl font-bold" style={{ color: theme.ink }}>Trait Scores</h2>
        <p className="mt-1 text-xs" style={{ color: theme.body }}>
          Factor-level scores derived from candidate responses.
        </p>
      </div>
      {factors.map((f) => (
        <FactorRow key={f.factor} factor={f} theme={theme} />
      ))}
    </div>
  );
}
