"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme, type ReportThemeContextValue } from "./report-theme-context";
import { reportTypography } from "./report-typography";
import { scoreColor, type CompetencyScoreData } from "./CompetencyReportPage";

/** Same "needs attention" cutoff CompetencyReportPage uses for score coloring and development-project picks. */
const FOCUS_THRESHOLD = 6.5;
const MAX_LISTED = 3;

// Same tint pair CompetencyReportPage uses for its Behavioural Implications /
// Watch-outs cards — reusing the exact colors makes this read as the same
// visual system as the per-competency pages instead of a separate one-off.
const STRENGTH_COLOR = "#047857"; // emerald-700
const STRENGTH_BG = "#F0FDFA"; // teal-50
const STRENGTH_BORDER = "#99F6E4"; // teal-200
const FOCUS_COLOR = "#B45309"; // amber-700
const FOCUS_BG = "#FFFBEB"; // amber-50
const FOCUS_BORDER = "#FDE68A"; // amber-200

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function SummaryList({
  title,
  accentColor,
  bgColor,
  borderColor,
  items,
  getDescription,
  emptyLabel,
  theme,
}: {
  title: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  items: CompetencyScoreData[];
  getDescription: (c: CompetencyScoreData) => string | null | undefined;
  emptyLabel: string;
  theme: ReportThemeContextValue["theme"];
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        alignSelf: "stretch",
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: "0.75rem 1rem",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      }}
    >
      <p style={{ ...reportTypography.h4, color: accentColor, marginBottom: 8 }}>{title}</p>
      {items.length > 0 ? (
        items.map((c) => {
          const description = getDescription(c);
          return (
            <div key={c.competencyId} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "flexStart", gap: 8 }}>
                <span style={{ marginTop: 7, height: 5, width: 5, borderRadius: 9999, backgroundColor: accentColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ ...reportTypography.bodySmall, fontWeight: 600, color: theme.ink }}>{c.competencyName}</span>
                    <span style={{ ...reportTypography.dataSmall, color: scoreColor(c.scaledScore), flexShrink: 0 }}>{c.scaledScore.toFixed(1)}</span>
                  </div>
                  {description && <p style={{ ...reportTypography.bodyXSmall, color: theme.body, marginTop: 1 }}>{description}</p>}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p style={{ ...reportTypography.bodyXSmall, color: theme.body }}>{emptyLabel}</p>
      )}
    </div>
  );
}

/**
 * An HR-readable synthesis of the competency profile: a plain-language
 * narrative naming the strongest and weakest areas, then two ranked lists —
 * styled with the same card language (tint, border, dot bullets) as the
 * Behavioural Implications / Watch-outs pair on the per-competency pages, so
 * it reads as part of the report rather than a bolted-on extra. Second half
 * of the Executive Summary section (the radar/cohort-comparison page is the
 * first), landing right before the Report Interpretation page.
 */
export function CompetencyExecutiveSummaryPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const competencies: CompetencyScoreData[] = report.competencyScores;

  if (competencies.length === 0) return null;

  const aboveThreshold = [...competencies].sort((a, b) => b.scaledScore - a.scaledScore).filter((c) => c.scaledScore > FOCUS_THRESHOLD);
  const strengthList = (aboveThreshold.length > 0 ? aboveThreshold : [...competencies].sort((a, b) => b.scaledScore - a.scaledScore)).slice(
    0,
    MAX_LISTED,
  );

  const focusAreas = [...competencies]
    .sort((a, b) => a.scaledScore - b.scaledScore)
    .filter((c) => c.scaledScore <= FOCUS_THRESHOLD)
    .slice(0, MAX_LISTED);

  const strengthNames = formatList(strengthList.map((c) => c.competencyName));
  const focusNames = formatList(focusAreas.map((c) => c.competencyName));

  return (
    // Standalone page — same h2 + border-bottom title treatment as every
    // other top-level report page (Score Overview, Trait Scores, etc.).
    <div>
      <div style={{ ...reportTypography.h2, borderBottom: `2px solid ${theme.ink}`, paddingBottom: "0.5rem", marginBottom: "1.5rem", color: theme.ink }}>
        Executive Summary
      </div>

      <p style={{ ...reportTypography.body, color: theme.body, marginBottom: "1.5rem" }}>
        {strengthList.length > 0 && (
          <>
            Performance is strongest in <strong style={{ color: theme.ink }}>{strengthNames}</strong>
            {focusAreas.length > 0 ? ", " : ". "}
          </>
        )}
        {focusAreas.length > 0 ? (
          <>
            with the most immediate opportunity for growth in <strong style={{ color: theme.ink }}>{focusNames}</strong>. Prioritising
            coaching, feedback or structured development {focusAreas.length > 1 ? "here" : "in this area"} is likely to have the greatest
            impact on overall effectiveness.
          </>
        ) : (
          <>No competency falls at or below the proficient threshold — a well-rounded profile with no immediate red flags.</>
        )}
      </p>

      <div style={{ display: "flex", alignItems: "stretch", gap: 16, flexWrap: "wrap" }}>
        <SummaryList
          title="Key Strengths"
          accentColor={STRENGTH_COLOR}
          bgColor={STRENGTH_BG}
          borderColor={STRENGTH_BORDER}
          items={strengthList}
          getDescription={(c) => c.strengthStatement}
          emptyLabel="No competencies scored above the proficient threshold."
          theme={theme}
        />
        <SummaryList
          title="Priority Focus Areas"
          accentColor={FOCUS_COLOR}
          bgColor={FOCUS_BG}
          borderColor={FOCUS_BORDER}
          items={focusAreas}
          getDescription={(c) => c.developmentNeedStatement}
          emptyLabel="No competencies scored at or below the proficient threshold."
          theme={theme}
        />
      </div>
    </div>
  );
}
