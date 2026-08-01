"use client";

import { useReportTheme } from "@/components/reports/report-theme-context";

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
};

type Props = {
  competencies: CompetencyScoreData[];
  heading?: string;
  detailCompetencies?: CompetencyScoreData[];
  showOverview?: boolean;
  detailIndexOffset?: number;
};

/** Warning tone for "Watch-outs" — distinct from the accent used for Behavioural Implications. */
const WATCH_OUT_COLOR = "#B45309"; // amber-700

/** Score-based colors: green for > 6.5, blue for ≤ 6.5 */
function scoreColor(score: number): string {
  return score > 6.5 ? "#059669" : "#1D4ED8"; // emerald-600 / blue-700
}

/** Solid, saturated band colors — no pastel washes. White text sits directly on these. */
function bandColor(band: string): { solid: string } {
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
function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2" style={{ marginBottom: 4 }}>
          <span style={{ marginTop: 7, height: 5, width: 5, borderRadius: 9999, backgroundColor: color, flexShrink: 0 }} />
          <span className="text-sm" style={{ color }}>{item}</span>
        </div>
      ))}
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
        fontFamily="Arial, sans-serif"
        fontSize="14"
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
  showOverview = true,
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
        <p className="text-sm" style={{ color: theme.body }}>No competency scores available for this assessment.</p>
      </div>
    );
  }

  return (
    <div>
      {showOverview && (<>
      {/* Heading */}
      <div className="border-b-2 pb-2" style={{ borderColor: theme.ink, marginBottom: 24 }}>
        <h2 className="text-xl font-bold" style={{ color: theme.ink }}>
          {heading}
        </h2>
        <p className="mt-1 text-xs" style={{ color: theme.body }}>
          Scores are on a 1–10 scale derived from candidate responses mapped to each competency.
        </p>
      </div>

      {/* Score overview bar chart */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: theme.ink }}>Score Overview</h3>
        <div>
          {[...competencies]
            .sort((a, b) => b.scaledScore - a.scaledScore)
            .map((c) => {
              const scoreColorValue = scoreColor(c.scaledScore);
              return (
                <div key={c.competencyId} style={{ marginBottom: 14 }}>
                  <div className="flex items-center gap-4" style={{ marginBottom: 6 }}>
                    <span className="min-w-0 flex-1 font-medium" style={{ fontSize: 14, lineHeight: "20px", color: theme.ink }}>{c.competencyName}</span>
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <span className="text-sm font-bold leading-none" style={{ color: theme.ink }}>
                        {c.scaledScore.toFixed(1)}<span className="text-xs font-normal" style={{ color: theme.body }}>/10</span>
                      </span>
                      <span
                        className="rounded-sm px-2 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: scoreColorValue, color: theme.accentContrastText }}
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
              <div data-pdf-break-after="avoid" style={{ marginBottom: 20 }}>
                <p className="text-base font-extrabold uppercase tracking-[0.15em]" style={{ color: theme.ink }}>{domainName}</p>
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
                      <h3 className="min-w-0 font-bold leading-tight" style={{ color: theme.accentContrastText }}>{c.competencyName}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <span className="text-2xl font-bold leading-none" style={{ color: theme.accentContrastText }}>
                        {c.scaledScore.toFixed(1)}
                      </span>
                      <span className="text-sm" style={{ color: theme.accentContrastText, opacity: 0.85 }}>/ 10</span>
                      <span
                        className="rounded-sm px-2 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: "rgba(255,255,255,0.22)", color: theme.accentContrastText }}
                      >
                        {c.band}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="pt-5">
                    <div style={{ marginBottom: 20 }}>
                      <SegmentedScoreBar score={c.scaledScore} color={scoreColorValue} trackColor={theme.trackBackground} />
                    </div>

                    {c.reportDescription && (
                      <div data-pdf-break-inside="avoid" style={{ marginBottom: 20 }}>
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: theme.ink }}>Description</p>
                        <p className="text-base leading-relaxed" style={{ color: theme.body }}>{c.reportDescription}</p>
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
                       <div style={{ marginBottom: 20 }}>
                         <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: theme.ink }}>Score Interpretation</p>
                         <p data-pdf-break-inside="avoid" className="text-base leading-relaxed" style={{ marginBottom: 16, color: theme.body }}>{c.bandContent.proficiencyDescription}</p>
{developmentProjectCompetencyIds.has(c.competencyId) ? (
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                              {c.bandContent.behaviouralImplications.length > 0 && (
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <p className="mb-1.5 text-sm font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
                                    Behavioural Implications
                                  </p>
                                  <BulletList items={c.bandContent.behaviouralImplications} color={theme.body} />
                                </div>
                              )}
                              {c.bandContent.watchOuts.length > 0 && (
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <p className="mb-1.5 text-sm font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
                                    Watch-outs
                                  </p>
                                  <BulletList items={c.bandContent.watchOuts} color={theme.body} />
                                </div>
                              )}
                            </div>
                          ) : (
                           <>
{c.bandContent.behaviouralImplications.length > 0 && (
                                <div data-pdf-break-inside="avoid" style={{ marginBottom: 16 }}>
                                  <p className="mb-1.5 text-sm font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
                                    Behavioural Implications
                                  </p>
                                  <BulletList items={c.bandContent.behaviouralImplications} color={theme.body} />
                                </div>
                              )}
                              {c.bandContent.watchOuts.length > 0 && (
                                <div data-pdf-break-inside="avoid">
                                  <p className="mb-1.5 text-sm font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
                                    Watch-outs
                                  </p>
                                  <BulletList items={c.bandContent.watchOuts} color={theme.body} />
                                </div>
                              )}
                           </>
                         )}
                       </div>
                     ) : (
                      /* Generic band interpretation fallback (legacy competencies) */
                      <div data-pdf-break-inside="avoid" className="pl-3" style={{ borderLeft: `4px solid ${colors.solid}`, marginBottom: 20 }}>
                        <p className="text-sm" style={{ color: theme.body }}>
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
                      <p data-pdf-break-inside="avoid" className="pl-4 text-sm" style={{ borderLeft: `4px solid ${theme.hairline}`, marginBottom: 20, color: theme.ink, fontWeight: 600 }}>
                        {c.scaledScore > 6.5 ? c.strengthStatement : c.developmentNeedStatement}
                      </p>
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
                        <p data-pdf-break-after="avoid" className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: theme.body }}>
                          On-the-Job Development Projects
                        </p>
                        <div className="flex gap-3">
                          {c.developmentProjects.map((p, i) => (
                            <div key={i} className="min-w-0 flex-1 p-3" style={{ border: `1px solid ${theme.hairline}` }}>
                              <p className="text-sm font-bold" style={{ color: theme.ink }}>{p.title}</p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.body }}>What to do</p>
                              <p className="whitespace-pre-line text-xs" style={{ color: theme.body }}>{p.whatToDo}</p>
                              {p.howToDoIt && (
                                <>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.body }}>How to do it</p>
                                  <p className="whitespace-pre-line text-xs" style={{ color: theme.body }}>{p.howToDoIt}</p>
                                </>
                              )}
                              {p.evidence && (
                                <>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.body }}>How to measure</p>
                                  <p className="whitespace-pre-line text-xs" style={{ color: theme.body }}>{p.evidence}</p>
                                </>
                              )}
                            </div>
                          ))}
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
