"use client";

import { useReportTheme } from "@/components/reports/report-theme-context";
import { reportTypography } from "./report-typography";
import { CompetencyRadarChart } from "./CompetencyRadarChart";

export type CompetencyScoreData = {
  competencyId: string;
  competencyName: string;
  domainName?: string | null;
  scaledScore: number;
  percent: number;
  band: string;
  reportDescription?: string | null;
  attributes?: Array<{ name: string; code: string; score?: number; maxScore?: number }>;
  strengthStatement?: string | null;
  developmentNeedStatement?: string | null;
  bandContent?: {
    proficiencyDescription: string;
    behaviouralImplications: string[];
    watchOuts: string[];
  } | null;
  developmentProjects?: Array<{ title: string; whatToDo: string; howToDoIt: string; evidence: string }>;
  /** Median scaled score (1–10) across other completed attempts on the same assessment. Null when the cohort is too small. */
  medianScaledScore?: number | null;
};

type Props = {
  competencies: CompetencyScoreData[];
  heading?: string;
  detailCompetencies?: CompetencyScoreData[];
  /** Render the page heading + candidate-vs-cohort radar chart. */
  showRadar?: boolean;
  /** Render the ranked score-overview list (its own page heading when shown alone). */
  showScoreOverview?: boolean;
  /** Radar chart height in px — shrunk when the chart shares a page with other content. */
  radarHeight?: number;
  detailIndexOffset?: number;
};

/** Warning tone for "Watch-outs" — distinct from the accent used for Behavioural Implications. */
const WATCH_OUT_COLOR = "#B45309"; // amber-700

/** Light box tints for the parallel Behavioural Implications / Watch-outs cards. */
const IMPLICATION_BG = "#F0FDFA"; // teal-50
const IMPLICATION_BORDER = "#99F6E4"; // teal-200
const WATCH_OUT_BG = "#FFFBEB"; // amber-50
const WATCH_OUT_BORDER = "#FDE68A"; // amber-200

/** Score-based colors: green for > 6.5, blue for ≤ 6.5 */
export function scoreColor(score: number): string {
  return score > 6.5 ? "#059669" : "#1D4ED8"; // emerald-600 / blue-700
}

/** Solid, saturated band colors — no pastel washes. White text sits directly on these. */
export function bandColor(band: string): { solid: string } {
  switch (band) {
    // Legacy 5-band scale (GENERIC_5)
    case "Exceptional":
      return { solid: "#047857" }; // emerald-700
    case "Strong":
      return { solid: "#1D4ED8" }; // blue-700
    case "Moderate":
      return { solid: "#B45309" }; // amber-700
    case "Low":
      return { solid: "#B91C1C" }; // red-700

    // Job-role maturity scale (MATURITY_4)
    case "Expert":
      return { solid: "#6D28D9" }; // violet-700
    case "Proficient":
      return { solid: "#047857" }; // emerald-700
    case "Intermediate":
      return { solid: "#1D4ED8" }; // blue-700
    case "Developing":
      return { solid: "#C2410C" }; // orange-700

    default:
      return { solid: "#334155" }; // slate-700
  }
}

// Plain nested block (no position:absolute, no Tailwind space-y/variable utilities) —
// kept as basic layout primitives from an earlier html2canvas-based PDF pipeline;
// the export now prints the real DOM in headless Chrome, so this is no longer required
// but is left as-is since it renders correctly.
function SegmentedScoreBar({
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

// Manual bullet rows, not <ul>/list-disc — same leftover-from-html2canvas reasoning
// as the SegmentedScoreBar note above; no longer required but renders correctly.
function BulletList({ items, dotColor, textColor }: { items: string[]; dotColor: string; textColor: string }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flexStart", gap: "0.5rem", marginBottom: 2 }}>
          <span style={{ marginTop: 7, height: 5, width: 5, borderRadius: 9999, backgroundColor: dotColor, flexShrink: 0 }} />
          <span style={{ ...reportTypography.bodySmall, color: textColor }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/** Light-tinted card used for the parallel Behavioural Implications / Watch-outs pair. */
function ImplicationBox({
  title,
  items,
  accentColor,
  bgColor,
  borderColor,
  textColor,
}: {
  title: string;
  items: string[];
  accentColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 200,
        alignSelf: "stretch",
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: "0.625rem 0.875rem",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      }}
    >
      <p style={{ ...reportTypography.h3, marginBottom: 5, color: accentColor }}>{title}</p>
      <BulletList items={items} dotColor={accentColor} textColor={textColor} />
    </div>
  );
}

function CompetencyNumberBadge({ number, color }: { number: number; color: string }) {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" aria-label={`Competency ${number}`}>
      <circle cx="16" cy="16" r="16" fill="#ffffff" />
      <text
        x="16"
        y="16"
        fill={color}
        fontFamily={reportTypography.fontFamily}
        fontSize={reportTypography.dataSmall.fontSize}
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {number}
      </text>
    </svg>
  );
}

export function CompetencyReportPage({
  competencies,
  heading = "Competency Profile",
  detailCompetencies = competencies,
  showRadar = true,
  showScoreOverview = true,
  radarHeight = 340,
  detailIndexOffset = 0,
}: Props) {
  const { theme } = useReportTheme();
  const developmentProjectCompetencyIds = new Set(
    competencies
      .map((competency, index) => ({ competency, index }))
      .sort(
        (a, b) =>
          a.competency.scaledScore - b.competency.scaledScore || a.index - b.index,
      )
      .slice(0, 3)
      .filter(({ competency }) => competency.scaledScore <= 6.5)
      .map(({ competency }) => competency.competencyId),
  );

  if (competencies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ ...reportTypography.bodySmall, color: theme.body }}>No competency scores available for this assessment.</p>
      </div>
    );
  }

return (
    <div>
      {showRadar && (<>
      {/* Heading */}
      <div style={{ ...reportTypography.h2, borderBottom: `2px solid ${theme.ink}`, paddingBottom: "0.5rem", marginBottom: "1.5rem", color: theme.ink }}>
        {heading}
      </div>
      <p style={{ ...reportTypography.bodyXSmall, color: theme.body, marginTop: "0.25rem" }}>
        Scores are on a 1–10 scale derived from candidate responses mapped to each competency.
      </p>

      {/* Candidate vs. cohort median — spider/radar comparison */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ ...reportTypography.h3, marginBottom: "0.5rem", color: theme.ink }}>Candidate vs. Cohort Median</h3>
        <CompetencyRadarChart
          height={radarHeight}
          competencies={competencies.map((c) => ({
            competencyId: c.competencyId,
            competencyName: c.competencyName,
            scaledScore: c.scaledScore,
            medianScaledScore: c.medianScaledScore ?? null,
          }))}
        />
      </div>
      </>)}

      {showScoreOverview && (<>
      {/* Page heading — standalone when the radar page precedes it on its own sheet */}
      <div style={{ ...reportTypography.h2, borderBottom: `2px solid ${theme.ink}`, paddingBottom: "0.5rem", marginBottom: "1.5rem", color: theme.ink }}>
        Score Overview
      </div>
      <p style={{ ...reportTypography.bodyXSmall, color: theme.body, marginTop: "-1rem", marginBottom: "1.5rem" }}>
        Every competency scored in this assessment, ranked highest to lowest.
      </p>

      {/* Score overview bar chart */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div>
          {[...competencies]
            .sort((a, b) => b.scaledScore - a.scaledScore)
            .map((c) => {
              const scoreColorValue = scoreColor(c.scaledScore);
              return (
                <div key={c.competencyId} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: 6 }}>
                    <span style={{ ...reportTypography.bodySmall, flex: 1, minWidth: 0, fontWeight: 500, color: theme.ink }}>{c.competencyName}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                      <span style={{ ...reportTypography.dataSmall, lineHeight: 1, color: theme.ink }}>
                        {c.scaledScore.toFixed(1)}<span style={{ ...reportTypography.bodyXSmall, fontWeight: 400, color: theme.body }}> / 10</span>
                      </span>
                      <span
                        style={{
                          ...reportTypography.badge,
                          borderRadius: "9999px",
                          padding: "0.25rem 0.75rem",
                          backgroundColor: scoreColorValue,
                          color: theme.accentContrastText,
                        }}
                      >
                        {c.band}
                      </span>
                    </span>
                  </div>
                  <SegmentedScoreBar score={c.scaledScore} color={scoreColorValue} trackColor={theme.trackBackground} />
                </div>
              );
            })}
        </div>
      </div>
      </>)}

      {/* Detailed competency cards, grouped by Domain when present */}
      <div>
        {groupByDomain(detailCompetencies).map(([domainName, group], groupIdx, groupArr) => (
          <div key={domainName ?? "__ungrouped"} style={{ marginBottom: groupIdx < groupArr.length - 1 ? 32 : 0 }}>
            {domainName && (
              <div data-pdf-break-after="avoid" style={{ marginBottom: 8 }}>
                <p style={{ ...reportTypography.h3, marginBottom: 4, color: theme.accent, letterSpacing: "0.08em" }}>{domainName}</p>
                <div style={{ height: 2, width: 28, backgroundColor: theme.accent, borderRadius: 1 }} />
              </div>
            )}
            {group.map((c, idx) => {
              const scoreColorValue = scoreColor(c.scaledScore);
              const colors = bandColor(c.band);
              return (
                <div key={c.competencyId} style={{ marginBottom: idx < group.length - 1 ? 24 : 0 }}>
                  {/*
                    Full-bleed solid-color header strip. break-after (not break-inside on the
                    whole card): this card easily runs taller than one A4 page, and marking a
                    block that tall as break-inside: avoid backfires — Chrome can't honor it, so
                    it defers the entire card to a fresh page and leaves the previous page's tail
                    blank. Only the header needs to stay glued to what follows it.
                  */}
                  <div
                    data-pdf-break-after="avoid"
                    className="-mx-10 flex items-center justify-between gap-4 px-10 py-4"
                    style={{ backgroundColor: scoreColorValue }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <CompetencyNumberBadge number={detailIndexOffset + idx + 1} color={scoreColorValue} />
                      <h3 className="min-w-0 leading-tight" style={{ ...reportTypography.h2, color: theme.accentContrastText }}>{c.competencyName}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <span style={{ ...reportTypography.dataLarge, lineHeight: 1, color: theme.accentContrastText }}>
                        {c.scaledScore.toFixed(1)}
                      </span>
                      <span style={{ ...reportTypography.bodySmall, color: theme.accentContrastText, opacity: 0.85 }}>/ 10</span>
                      <span
                        style={{
                          ...reportTypography.badge,
                          borderRadius: "9999px",
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "rgba(255,255,255,0.22)",
                          color: theme.accentContrastText,
                        }}
                      >
                        {c.band}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="pt-5">
                    <div style={{ marginBottom: 14 }}>
                      <SegmentedScoreBar score={c.scaledScore} color={scoreColorValue} trackColor={theme.trackBackground} />
                    </div>

                    {(c.reportDescription || c.bandContent) && (
                      <div
                        data-pdf-break-inside="avoid"
                        style={{
                          backgroundColor: `${theme.accent}08`,
                          border: `1px solid ${theme.accent}2E`,
                          borderLeft: `4px solid ${theme.accent}`,
                          borderRadius: 8,
                          padding: "0.625rem 1rem",
                          marginBottom: 12,
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                        }}
                      >
                        {c.reportDescription && (
                          <div style={{ marginBottom: c.bandContent ? 8 : 0 }}>
                            <p style={{ ...reportTypography.h3, marginBottom: 6, color: theme.ink }}>Description</p>
                            <p style={{ ...reportTypography.body, color: theme.body }}>{c.reportDescription}</p>
                          </div>
                        )}
                        {c.bandContent && (
                          <div>
                            <p style={{ ...reportTypography.h3, marginBottom: 6, color: theme.ink }}>Score Interpretation</p>
                            <p style={{ ...reportTypography.body, color: theme.body }}>{c.bandContent.proficiencyDescription}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/*
                      Band-specific proficiency description (Job Role frameworks). Each
                      sub-block gets its own break-inside: avoid instead of one for the whole
                      section — the section as a whole can run long enough to exceed a page,
                      and (as with the card-level wrapper above) marking an over-long block
                      atomic backfires by deferring it whole to a blank-looking fresh page.
                    */}
{c.bandContent ? (
                       <div style={{ marginBottom: 12 }}>
                         {(c.bandContent.behaviouralImplications.length > 0 || c.bandContent.watchOuts.length > 0) && (
                           <div data-pdf-break-inside="avoid" style={{ display: "flex", alignItems: "stretch", gap: 16, flexWrap: "wrap" }}>
                             <ImplicationBox
                               title="Behavioural Implications"
                               items={c.bandContent.behaviouralImplications}
                               accentColor={theme.accent}
                               bgColor={IMPLICATION_BG}
                               borderColor={IMPLICATION_BORDER}
                               textColor={theme.body}
                             />
                             <ImplicationBox
                               title="Watch-outs"
                               items={c.bandContent.watchOuts}
                               accentColor={WATCH_OUT_COLOR}
                               bgColor={WATCH_OUT_BG}
                               borderColor={WATCH_OUT_BORDER}
                               textColor={theme.body}
                             />
                           </div>
                         )}
                       </div>
                     ) : (
                      /* Generic band interpretation fallback (legacy competencies) */
                      <div
                        data-pdf-break-inside="avoid"
                        style={{
                          backgroundColor: `${colors.solid}14`,
                          border: `1px solid ${colors.solid}33`,
                          borderLeft: `4px solid ${colors.solid}`,
                          borderRadius: 8,
                          padding: "0.625rem 1rem",
                          marginBottom: 12,
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                        }}
                      >
                        <p style={{ ...reportTypography.bodySmall, color: theme.body }}>
                          {c.band === "Exceptional" && "Demonstrates outstanding capability. A key strength to leverage."}
                          {c.band === "Strong" && "Demonstrates solid capability. Performs effectively in this area."}
                          {c.band === "Moderate" && "Shows adequate capability with room for further development."}
                          {c.band === "Low" && "Further development needed. Consider targeted coaching or training."}
                          {c.band === "Expert" && "Demonstrates the competency in complex situations and strengthens practices in others."}
                          {c.band === "Proficient" && "Demonstrates the competency independently and consistently — the expected level for this role."}
                          {c.band === "Intermediate" && "Demonstrates the competency in routine situations but is inconsistent in difficult contexts."}
                          {c.band === "Developing" && "Requires regular guidance and structured support to build basic consistency."}
                        </p>
                      </div>
                    )}

                    {/* Strength / development-need statement */}
                    {(c.strengthStatement || c.developmentNeedStatement) && (
                      <div
                        data-pdf-break-inside="avoid"
                        style={{
                          backgroundColor: `${scoreColorValue}14`,
                          border: `1px solid ${scoreColorValue}33`,
                          borderLeft: `4px solid ${scoreColorValue}`,
                          borderRadius: 8,
                          padding: "0.5rem 1rem",
                          marginBottom: 12,
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                        }}
                      >
                        <p style={{ ...reportTypography.bodySmall, color: theme.ink, fontWeight: 600 }}>
                          {c.scaledScore > 6.5 ? c.strengthStatement : c.developmentNeedStatement}
                        </p>
                      </div>
                    )}

                    {/*
                      On-the-job development projects. Deliberately NOT break-inside: avoid —
                      that forced the whole three-card grid onto a fresh page even when the
                      current page had clearly enough room left, leaving a large blank gap
                      above it. Letting it flow uses that leftover space instead.
                    */}
                    {developmentProjectCompetencyIds.has(c.competencyId) &&
                      c.developmentProjects &&
                      c.developmentProjects.length > 0 && (
                      <div>
                        <p data-pdf-break-after="avoid" style={{ ...reportTypography.h3, marginBottom: 4, color: theme.ink }}>
                          On-the-Job Development Projects
                        </p>
                        {/*
                          Floated columns, not flex/grid — Chrome's print engine doesn't split
                          an overflowing flex row across pages: it defers the *entire* row whole
                          to a fresh page, leaving a large blank gap behind. Floats fragment
                          properly instead — but only as long as this wrapper stays a plain
                          block. `overflow: hidden` is the usual float-clearfix, but it (like
                          `flex`/`grid`) establishes a new block-formatting context, and Chrome
                          treats *those* as atomic for pagination too — same bug, different
                          trigger. A trailing `clear: both` div clears the floats without turning
                          the wrapper into a BFC, so it stays plain, fragmentable block flow.
                        */}
                        <div>
                          {c.developmentProjects.map((p, i, projects) => (
                            <div
                              key={i}
                              style={{
                                float: "left",
                                width: "calc((100% - 24px) / 3)",
                                marginRight: i < projects.length - 1 ? 12 : 0,
                                backgroundColor: `${theme.accent}08`,
                                border: `1px solid ${theme.accent}2E`,
                                borderTop: `3px solid ${theme.accent}`,
                                borderRadius: 8,
                                padding: "0.5rem 0.875rem 0.625rem",
                                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                              }}
                            >
                              <p style={{ ...reportTypography.bodySmall, fontWeight: 700, color: theme.ink, marginBottom: 4, minHeight: 42 }}>{p.title}</p>
                              <p style={{ ...reportTypography.h4, color: theme.body, marginTop: 6 }}>What to do</p>
                              <p className="whitespace-pre-line" style={{ ...reportTypography.bodyXSmall, color: theme.body }}>{p.whatToDo}</p>
                              {p.howToDoIt && (
                                <>
                                  <p style={{ ...reportTypography.h4, color: theme.body, marginTop: 6 }}>How to do it</p>
                                  <p className="whitespace-pre-line" style={{ ...reportTypography.bodyXSmall, color: theme.body }}>{p.howToDoIt}</p>
                                </>
                              )}
                              {p.evidence && (
                                <>
                                  <p style={{ ...reportTypography.h4, color: theme.body, marginTop: 6 }}>How to measure</p>
                                  <p className="whitespace-pre-line" style={{ ...reportTypography.bodyXSmall, color: theme.body }}>{p.evidence}</p>
                                </>
                              )}
                            </div>
                          ))}
                          <div style={{ clear: "both" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Groups competencies by domainName while preserving first-seen order; ungrouped (null) competencies form their own trailing group. */
function groupByDomain(competencies: CompetencyScoreData[]): Array<[string | null, CompetencyScoreData[]]> {
  const order: (string | null)[] = [];
  const groups = new Map<string | null, CompetencyScoreData[]>();
  for (const c of competencies) {
    const key = c.domainName ?? null;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(c);
  }
  return order.map((key) => [key, groups.get(key)!]);
}
