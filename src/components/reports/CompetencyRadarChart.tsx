"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { REPORT_DESIGN_COLORS } from "@/components/reports/report-theme";
import { reportTypography } from "@/components/reports/report-typography";

const C = REPORT_DESIGN_COLORS;

export type RadarCompetencyDatum = {
  competencyId: string;
  competencyName: string;
  scaledScore: number;
  medianScaledScore: number | null;
};

const COHORT_COLOR = "#94A3B8"; // slate-400

/** Two-line competency name + its score, matching the reference's on-chart
 *  axis labels exactly (score in the same muted eyebrow-blue used for every
 *  other small-caps/label element in the report). */
function AxisTick({ x, y, cx, cy, payload, scoreByName }: any) {
  const score = scoreByName.get(payload.value) as number | undefined;
  // Nudge the label away from the chart along the line from center through
  // this vertex, so it doesn't collide with the polygon at wide angles.
  const dx = x - cx;
  const dy = y - cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = x + (dx / len) * 8;
  const ny = y + (dy / len) * 8;
  const anchor = Math.abs(dx) < 4 ? "middle" : dx > 0 ? "start" : "end";
  const words = payload.value.split(" ");
  const mid = Math.ceil(words.length / 2);
  const lines = words.length > 2 ? [words.slice(0, mid).join(" "), words.slice(mid).join(" ")] : [payload.value];

  return (
    <text x={nx} y={ny} textAnchor={anchor} style={{ fontFamily: reportTypography.fontFamily }}>
      {lines.map((line, i) => (
        <tspan key={i} x={nx} dy={i === 0 ? 0 : 13} fontSize={10.5} fill={C.body}>
          {line}
        </tspan>
      ))}
      {score != null && (
        <tspan x={nx} dy={14} fontSize={11} fontWeight={700} fill={C.eyebrow}>
          {score.toFixed(1)}
        </tspan>
      )}
    </text>
  );
}

/** Small square vertex marker, matching the reference's dot style (recharts'
 *  default radar dot is a circle). */
function SquareDot({ cx, cy, stroke }: any) {
  return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={stroke} />;
}

/**
 * Spider/radar chart comparing the candidate's competency profile against the
 * cohort median (other candidates who completed the same assessment). Median
 * is only plotted when every competency has one — a partial polygon with
 * missing vertices reads as broken rather than "not enough data yet". Fixed
 * colors (REPORT_DESIGN_COLORS), not tenant theme — same reasoning as every
 * other redesigned report component: matches the reference exactly regardless
 * of which tenant generated the report.
 */
export function CompetencyRadarChart({
  competencies,
  height = 340,
}: {
  competencies: RadarCompetencyDatum[];
  /** Chart height in px — reduced on pages where the chart shares space with other content. */
  height?: number;
}) {
  // A radar with fewer than 3 axes doesn't read as a shape.
  if (competencies.length < 3) return null;

  const hasCohort = competencies.every((c) => c.medianScaledScore !== null);
  const data = competencies.map((c) => ({
    subject: c.competencyName,
    you: Number(c.scaledScore.toFixed(1)),
    median: hasCohort ? Number((c.medianScaledScore as number).toFixed(1)) : undefined,
  }));
  const scoreByName = new Map(data.map((d) => [d.subject, d.you]));

  return (
    <div style={{ marginBottom: "1.5rem" }} data-testid="competency-radar-chart">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="65%">
            <PolarGrid stroke={C.hairline} />
            <PolarAngleAxis dataKey="subject" tick={<AxisTick scoreByName={scoreByName} />} />
            {/* No numeric tick labels: at angle=90 they render on top of the
                "Trust and Fairness" category label at the top vertex — the
                grid rings from PolarGrid already communicate scale. */}
            <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={false} axisLine={false} />
            <Radar name="You" dataKey="you" stroke={C.ink} fill={C.ink} fillOpacity={0.06} strokeWidth={1.75} dot={<SquareDot />} />
            {hasCohort && (
              <Radar
                name="Cohort median"
                dataKey="median"
                stroke={COHORT_COLOR}
                fill={COHORT_COLOR}
                fillOpacity={0.08}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={<SquareDot />}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Reference-style caption row replacing recharts' built-in legend —
          a swatch + description per series, plus the ring-scale note. */}
      <div className="flex items-start" style={{ gap: 28, marginTop: 8, paddingTop: 10, borderTop: `1px solid ${C.hairline}` }}>
        <div className="flex items-start gap-2">
          <span style={{ marginTop: 6, width: 14, height: 2, backgroundColor: C.ink, flexShrink: 0 }} />
          <p style={{ ...reportTypography.bodyXSmall, color: C.body }}>
            <strong style={{ color: C.ink }}>Candidate profile</strong>
          </p>
        </div>
        <p style={{ ...reportTypography.bodyXSmall, color: C.body, flex: 1 }}>
          {hasCohort ? (
            <>
              <span className="inline-flex items-center gap-2" style={{ marginRight: 6 }}>
                <span style={{ display: "inline-block", width: 14, height: 0, borderTop: `1.5px dashed ${COHORT_COLOR}`, verticalAlign: "middle" }} />
              </span>
              Cohort median — the middle score among other candidates who completed this assessment.
            </>
          ) : (
            "Cohort too small to publish a median — the candidate's own scores are shown alone."
          )}
        </p>
        <p style={{ ...reportTypography.bodyXSmall, color: C.body, whiteSpace: "nowrap" }}>Rings mark 2, 4, 6, 8 and 10.</p>
      </div>
    </div>
  );
}
