"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { useReportTheme } from "@/components/reports/report-theme-context";

export type RadarCompetencyDatum = {
  competencyId: string;
  competencyName: string;
  scaledScore: number;
  medianScaledScore: number | null;
};

const COHORT_COLOR = "#94A3B8"; // slate-400 — neutral so it never competes with the tenant accent

/**
 * Spider/radar chart comparing the candidate's competency profile against the
 * cohort median (other candidates who completed the same assessment). Median
 * is only plotted when every competency has one — a partial polygon with
 * missing vertices reads as broken rather than "not enough data yet".
 */
export function CompetencyRadarChart({
  competencies,
  height = 340,
}: {
  competencies: RadarCompetencyDatum[];
  /** Chart height in px — reduced on pages where the chart shares space with other content. */
  height?: number;
}) {
  const { theme } = useReportTheme();

  // A radar with fewer than 3 axes doesn't read as a shape.
  if (competencies.length < 3) return null;

  const hasCohort = competencies.every((c) => c.medianScaledScore !== null);
  const data = competencies.map((c) => ({
    subject: c.competencyName,
    you: Number(c.scaledScore.toFixed(1)),
    median: hasCohort ? Number((c.medianScaledScore as number).toFixed(1)) : undefined,
  }));

  return (
    <div style={{ marginBottom: "1.5rem" }} data-testid="competency-radar-chart">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke={theme.hairline} />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: theme.body }} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fontSize: 10, fill: theme.body }} />
            <Radar name="You" dataKey="you" stroke={theme.accent} fill={theme.accent} fillOpacity={0.35} strokeWidth={2} />
            {hasCohort && (
              <Radar
                name="Cohort median"
                dataKey="median"
                stroke={COHORT_COLOR}
                fill={COHORT_COLOR}
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            )}
            <Legend wrapperStyle={{ fontSize: 12, color: theme.body }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {!hasCohort && (
        <p style={{ fontSize: 11, color: theme.body, textAlign: "center", marginTop: 4 }}>
          Cohort comparison will appear once enough candidates have completed this assessment.
        </p>
      )}
    </div>
  );
}
