"use client";

import type { ReportPayload } from "@/lib/report-data";
import { REPORT_DESIGN_COLORS } from "./report-theme";
import { reportTypography } from "./report-typography";
import { SectionHeading } from "./SectionHeading";
import { type CompetencyScoreData } from "./CompetencyReportPage";

const C = REPORT_DESIGN_COLORS;

/** Same "needs attention" cutoff CompetencyReportPage uses for score coloring and development-project picks. */
const FOCUS_THRESHOLD = 6.5;
const MAX_LISTED = 3;

const STRENGTH_COLOR = "#047857"; // emerald-700
const FOCUS_COLOR = "#B91C1C"; // red-700

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function SummaryCard({ title, accentColor, items }: { title: string; accentColor: string; items: CompetencyScoreData[] }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <span style={{ height: 8, width: 8, borderRadius: 2, backgroundColor: accentColor }} />
        <p style={{ ...reportTypography.h4, color: C.ink, letterSpacing: "0.08em" }}>{title}</p>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {items.map((c) => (
          <div key={c.competencyId} style={{ border: `1px solid ${C.hairline}`, borderRadius: 10, padding: "0.875rem 1rem" }}>
            <div className="flex items-baseline justify-between gap-2">
              <span style={{ ...reportTypography.bodySmall, fontWeight: 700, color: C.ink }}>{c.competencyName}</span>
              <span style={{ ...reportTypography.h2, color: accentColor }}>{c.scaledScore.toFixed(1)}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, backgroundColor: C.hairline, marginTop: 8, marginBottom: 8 }}>
              <div style={{ height: 4, borderRadius: 2, width: `${Math.min(100, (c.scaledScore / 10) * 100)}%`, backgroundColor: accentColor }} />
            </div>
            {(c.strengthStatement || c.developmentNeedStatement) && (
              <p style={{ ...reportTypography.bodyXSmall, color: C.body }}>
                {c.scaledScore > FOCUS_THRESHOLD ? c.strengthStatement : c.developmentNeedStatement}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * An HR-readable synthesis of the competency profile: a plain-language
 * narrative naming the strongest and weakest areas, then two ranked card
 * grids — Key Strengths (green) and Priority Focus Areas (red), matching
 * the reference design's "What the profile says" page. Second half of the
 * Executive Summary section (the radar/cohort-comparison page is the
 * first), landing right before the Report Interpretation page.
 */
export function CompetencyExecutiveSummaryPage({ report }: { report: ReportPayload }) {
  const competencies: CompetencyScoreData[] = report.competencyScores;

  if (competencies.length === 0) return null;

  const aboveThreshold = [...competencies].sort((a, b) => b.scaledScore - a.scaledScore).filter((c) => c.scaledScore > FOCUS_THRESHOLD);
  const strengthList = (aboveThreshold.length > 0 ? aboveThreshold : [...competencies].sort((a, b) => b.scaledScore - a.scaledScore)).slice(
    0,
    MAX_LISTED,
  );

  // Tail of the same descending order strengthList/the score overview page
  // use, not an independent ascending sort — with tied scores those two
  // orderings can disagree on which row lands in the bottom 3.
  const focusAreas = [...competencies]
    .sort((a, b) => b.scaledScore - a.scaledScore)
    .slice(-MAX_LISTED)
    .filter((c) => c.scaledScore <= FOCUS_THRESHOLD)
    .reverse();

  const strengthNames = formatList(strengthList.map((c) => c.competencyName));
  const focusNames = formatList(focusAreas.map((c) => c.competencyName));

  return (
    <div>
      <SectionHeading eyebrow="Section 02 · Findings" title="What the profile says" />

      <p style={{ ...reportTypography.body, color: C.body, marginTop: "0.75rem", marginBottom: "1.75rem" }}>
        {strengthList.length > 0 && (
          <>
            Performance is strongest in <strong style={{ color: C.ink }}>{strengthNames}</strong>
            {focusAreas.length > 0 ? ". " : ". "}
          </>
        )}
        {focusAreas.length > 0 ? (
          <>
            The most immediate opportunity for growth sits in <strong style={{ color: C.ink }}>{focusNames}</strong>. Coaching, feedback or
            structured development {focusAreas.length > 1 ? "in these areas" : "here"} is likely to have the greatest impact on overall
            effectiveness.
          </>
        ) : (
          <>No competency falls at or below the proficient threshold — a well-rounded profile with no immediate red flags.</>
        )}
      </p>

      <SummaryCard title="Key Strengths" accentColor={STRENGTH_COLOR} items={strengthList} />
      <div style={{ height: 20 }} />
      <SummaryCard title="Priority Focus Areas" accentColor={FOCUS_COLOR} items={focusAreas} />
    </div>
  );
}
