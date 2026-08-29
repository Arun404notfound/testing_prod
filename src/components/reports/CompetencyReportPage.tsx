"use client";

import { reportTypography } from "./report-typography";
import { REPORT_DESIGN_COLORS } from "./report-theme";
import { SectionHeading, CornerTick } from "./SectionHeading";
import { CompetencyRadarChart } from "./CompetencyRadarChart";

const C = REPORT_DESIGN_COLORS;

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

/** Small uppercase field label + hairline rule — heads every plain content
 *  block inside a competency card (Description, Score Interpretation,
 *  Behavioural Implications, Watch-outs). Matches the reference exactly:
 *  no boxes/backgrounds anywhere inside the card, just labels and rules. */
function FieldLabel({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ ...reportTypography.h4, color: C.eyebrow, letterSpacing: "0.08em", marginBottom: 6 }}>{title.toUpperCase()}</p>
      <div style={{ height: 1, backgroundColor: C.hairline }} />
    </div>
  );
}

/** Plain square-bullet list — solid square for Behavioural Implications,
 *  hollow (outlined) square for Watch-outs. No card/background of any kind. */
function SquareBulletList({ items, color, hollow = false }: { items: string[]; color: string; hollow?: boolean }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", marginBottom: 8 }}>
          <span
            style={{
              marginTop: 6,
              height: 8,
              width: 8,
              flexShrink: 0,
              backgroundColor: hollow ? "transparent" : color,
              border: hollow ? `1.5px solid ${color}` : "none",
            }}
          />
          <span style={{ ...reportTypography.bodySmall, color: C.body }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/** On-the-job development projects, as a real bordered table (rows = What to
 *  do / How to do it / How to measure, columns = the up-to-3 projects) —
 *  matches the reference's clean editorial table instead of colored cards.
 *  Real <table> markup fragments cleanly row-by-row under Chrome's print
 *  engine, unlike flex/grid (see the float-based layout this replaced,
 *  documented elsewhere in this file for why flex/grid were avoided there). */
function DevelopmentProjectsTable({
  projects,
}: {
  projects: Array<{ title: string; whatToDo: string; howToDoIt: string; evidence: string }>;
}) {
  const rows: Array<{ label: string; key: "whatToDo" | "howToDoIt" | "evidence" }> = [
    { label: "What to do", key: "whatToDo" },
    { label: "How to do it", key: "howToDoIt" },
    { label: "How to measure", key: "evidence" },
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "16%" }} />
        {projects.map((_, i) => (
          <col key={i} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th style={{ borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }} />
          {projects.map((p, i) => (
            <th
              key={i}
              style={{
                textAlign: "left",
                verticalAlign: "top",
                padding: "0 14px 12px",
                borderLeft: `1px solid ${C.hairline}`,
                borderTop: `1.5px solid ${C.ink}`,
                borderBottom: `1.5px solid ${C.ink}`,
              }}
            >
              <span style={{ ...reportTypography.bodyXSmall, fontWeight: 700, color: C.accent }}>{String(i + 1).padStart(2, "0")}</span>{" "}
              <span style={{ ...reportTypography.bodySmall, fontWeight: 700, color: C.ink }}>{p.title}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={row.key} data-pdf-break-inside="avoid" style={{ borderBottom: rowIdx === rows.length - 1 ? `1.5px solid ${C.ink}` : `1px solid ${C.hairline}` }}>
            <td style={{ verticalAlign: "top", padding: "10px 14px 10px 0", ...reportTypography.bodyXSmall, fontWeight: 700, letterSpacing: "0.04em", color: C.ink }}>
              {row.label.toUpperCase()}
            </td>
            {projects.map((p, i) => (
              <td key={i} style={{ verticalAlign: "top", padding: "10px 14px", borderLeft: `1px solid ${C.hairline}` }}>
                <p className="whitespace-pre-line" style={{ ...reportTypography.bodyXSmall, color: C.body }}>
                  {p[row.key]}
                </p>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
  // Bottom 3 by rank (tail of the same descending order the score overview
  // and detail pages both use), not an independently-sorted-ascending list —
  // with tied scores those two orderings can disagree on which row is #10
  // vs #12 (see the identical fix on lowestThreeIds below).
  const developmentProjectCompetencyIds = new Set(
    [...competencies]
      .sort((a, b) => b.scaledScore - a.scaledScore)
      .slice(-3)
      .filter((competency) => competency.scaledScore <= 6.5)
      .map((competency) => competency.competencyId),
  );
  // Score Overview's 3-tier legend (green/blue/red) is stricter than the plain
  // >6.5 threshold used elsewhere — the lowest 3 are always red, matching the
  // reference's "priority focus" legend regardless of their raw score value.
  // Taken from the tail of the SAME descending-ranked order the list below
  // renders in (not an independent ascending sort) — with tied scores, an
  // independent sort can tie-break differently and pick a different row than
  // whichever one actually lands in the last 3 positions on screen.
  const lowestThreeIds = new Set(
    [...competencies]
      .sort((a, b) => b.scaledScore - a.scaledScore)
      .slice(-3)
      .map((c) => c.competencyId),
  );
  const overviewRowColor = (c: CompetencyScoreData) =>
    lowestThreeIds.has(c.competencyId) ? "#B91C1C" : c.scaledScore > 6.5 ? "#047857" : "#1D4ED8";

  if (competencies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ ...reportTypography.bodySmall, color: C.body }}>No competency scores available for this assessment.</p>
      </div>
    );
  }

return (
    <div>
      {showRadar && (<>
      <SectionHeading eyebrow="Section 02" title={heading} />
      <p style={{ ...reportTypography.body, color: C.body, marginTop: "0.5rem" }}>
        Scores run on a 1–10 scale, derived from the candidate&rsquo;s responses mapped to each competency.
      </p>

      {/* Candidate vs. cohort median — spider/radar comparison */}
      <div style={{ marginTop: "1.5rem" }}>
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
      <SectionHeading eyebrow="Section 04" title="Score overview" />
      <p style={{ ...reportTypography.body, color: C.body, marginTop: "0.5rem", marginBottom: "1.75rem" }}>
        Every competency scored in this assessment, ranked highest to lowest.
      </p>

      {/* Score overview — single continuous bar per row, a tick mark at the
          proficient threshold (6.0), 3-tier legend coloring (see overviewRowColor). */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", ...reportTypography.tableHeader, color: C.body, paddingBottom: 8, borderBottom: `1px solid ${C.hairline}`, marginBottom: 4 }}>
          <span style={{ width: 24 }} />
          <span style={{ flex: "0 0 34%" }}>Competency</span>
          <span style={{ flex: 1 }}>Scale 1–10</span>
          <span style={{ width: 60, textAlign: "right" }}>Score</span>
          <span style={{ width: 90, textAlign: "right" }}>Band</span>
        </div>
        {[...competencies]
          .sort((a, b) => b.scaledScore - a.scaledScore)
          .map((c, i) => {
            const rowColor = overviewRowColor(c);
            return (
              <div key={c.competencyId} style={{ display: "flex", alignItems: "center", gap: 0, padding: "0.75rem 0", borderBottom: `1px solid ${C.hairline}` }}>
                <span style={{ width: 24, ...reportTypography.bodyXSmall, color: C.body }}>{i + 1}</span>
                <span style={{ flex: "0 0 34%", ...reportTypography.bodySmall, fontWeight: 500, color: C.ink, paddingRight: 12 }}>{c.competencyName}</span>
                <span style={{ flex: 1, position: "relative", height: 8, backgroundColor: C.hairline, borderRadius: 4, marginRight: 16 }}>
                  <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, (c.scaledScore / 10) * 100)}%`, backgroundColor: rowColor, borderRadius: 4 }} />
                  <span style={{ position: "absolute", left: "60%", top: -2, bottom: -2, width: 1, backgroundColor: C.body, opacity: 0.5 }} />
                </span>
                <span style={{ width: 60, textAlign: "right", ...reportTypography.dataSmall, color: C.ink }}>{c.scaledScore.toFixed(1)}</span>
                <span style={{ width: 90, textAlign: "right", ...reportTypography.badge, letterSpacing: "0.06em", color: rowColor }}>{c.band}</span>
              </div>
            );
          })}
        <p style={{ ...reportTypography.bodyXSmall, color: C.body, marginTop: 10, textAlign: "right" }}>
          The vertical rule marks the proficient threshold at 6.0.
        </p>
      </div>
      </>)}

      {/* Detailed competency cards, grouped by Domain when present */}
      <div>
        {groupByDomain(detailCompetencies).map(([domainName, group], groupIdx, groupArr) => (
          <div key={domainName ?? "__ungrouped"} style={{ marginBottom: groupIdx < groupArr.length - 1 ? 32 : 0 }}>
            {group.map((c, idx) => {
              const scoreColorValue = overviewRowColor(c);
              const number = detailIndexOffset + idx + 1;
              // Reference shows the strength/development-need statement as a
              // one-line subtitle right under the title, not as a bottom
              // callout box — the box further down this card is a separate
              // score-based note (see below), kept for the rare case both exist.
              const subtitle = c.scaledScore > 6.5 ? c.strengthStatement : c.developmentNeedStatement;
              return (
                <div key={c.competencyId} style={{ marginBottom: idx < group.length - 1 ? 32 : 0 }}>
                  {domainName && (
                    <div data-pdf-break-after="avoid" className="flex items-baseline justify-between gap-3" style={{ marginBottom: 6 }}>
                      <span style={{ ...reportTypography.h4, color: C.domainLabel, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{domainName.toUpperCase()}</span>
                      <span style={{ flex: 1, height: 1, backgroundColor: C.hairline }} />
                      <span style={{ ...reportTypography.h4, color: C.body, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                        Competency {number} of {competencies.length}
                      </span>
                    </div>
                  )}
                  <div data-pdf-break-after="avoid" className="flex items-start justify-between gap-4" style={{ marginBottom: 24 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ ...reportTypography.display, color: C.ink }}>{c.competencyName}</h3>
                      {subtitle && <p style={{ ...reportTypography.body, color: C.body, marginTop: "0.4rem", maxWidth: "36rem" }}>{subtitle}</p>}
                    </div>
                    <div
                      className="shrink-0"
                      style={{ position: "relative", border: "1px solid #CBD5E1", padding: "0.75rem 1.5rem", textAlign: "right", minWidth: 130 }}
                    >
                      <CornerTick top left />
                      <CornerTick top left={false} />
                      <CornerTick top={false} left />
                      <CornerTick top={false} left={false} />
                      <span style={{ ...reportTypography.display, fontSize: "2.25rem", color: C.ink }}>{c.scaledScore.toFixed(1)}</span>
                      <span style={{ ...reportTypography.bodySmall, color: C.body }}> / 10</span>
                      <div style={{ height: 4, backgroundColor: C.hairline, marginTop: 8 }}>
                        <div style={{ height: 4, width: `${Math.min(100, (c.scaledScore / 10) * 100)}%`, backgroundColor: scoreColorValue }} />
                      </div>
                      <p style={{ ...reportTypography.badge, letterSpacing: "0.06em", color: scoreColorValue, marginTop: 8 }}>{c.band}</p>
                    </div>
                  </div>

                  {/* Body — a plain two-column layout throughout, no colored
                      cards/backgrounds/shadows anywhere: field label (small
                      uppercase + hairline rule) followed by plain text or a
                      square-bullet list, matching the reference exactly. */}
                  <div>
                    {(c.reportDescription || c.bandContent) && (
                      <div data-pdf-break-inside="avoid" className="flex items-start" style={{ gap: 40, marginBottom: 24 }}>
                        {c.reportDescription && (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <FieldLabel title="Description" />
                            <p style={{ ...reportTypography.body, color: C.body }}>{c.reportDescription}</p>
                          </div>
                        )}
                        {c.bandContent && (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <FieldLabel title="Score Interpretation" />
                            <p style={{ ...reportTypography.body, color: C.body }}>{c.bandContent.proficiencyDescription}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {c.bandContent ? (
                      (c.bandContent.behaviouralImplications.length > 0 || c.bandContent.watchOuts.length > 0) && (
                        <div data-pdf-break-inside="avoid" className="flex items-start" style={{ gap: 40, marginBottom: 24 }}>
                          {c.bandContent.behaviouralImplications.length > 0 && (
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <FieldLabel title="Behavioural Implications" />
                              <SquareBulletList items={c.bandContent.behaviouralImplications} color={C.accent} />
                            </div>
                          )}
                          {c.bandContent.watchOuts.length > 0 && (
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <FieldLabel title="Watch-outs" />
                              <SquareBulletList items={c.bandContent.watchOuts} color={C.danger} hollow />
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      /* Generic band interpretation fallback (legacy competencies without bandContent) */
                      <div data-pdf-break-inside="avoid" style={{ marginBottom: 24, maxWidth: "36rem" }}>
                        <FieldLabel title="Score Interpretation" />
                        <p style={{ ...reportTypography.body, color: C.body }}>
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

                    {/* Strength/development-need statement already rendered as the
                        card's subtitle, right under the title — not repeated here. */}

                    {developmentProjectCompetencyIds.has(c.competencyId) &&
                      c.developmentProjects &&
                      c.developmentProjects.length > 0 && (
                      <div>
                        <div data-pdf-break-after="avoid" className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                          <span style={{ height: 9, width: 9, backgroundColor: C.ink, flexShrink: 0 }} />
                          <p style={{ ...reportTypography.h3, color: C.ink, letterSpacing: "0.04em" }}>On-the-Job Development Projects</p>
                        </div>
                        <DevelopmentProjectsTable projects={c.developmentProjects} />
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
