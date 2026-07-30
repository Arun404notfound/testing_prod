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

function bandColor(band: string): { bg: string; text: string; border: string } {
  switch (band) {
    // Legacy 5-band scale (GENERIC_5)
    case "Exceptional":
      return { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" };
    case "Strong":
      return { bg: "#EFF6FF", text: "#1D4EDB", border: "#6EE7B7" };
    case "Moderate":
      return { bg: "#FFFBEB", text: "#92400E", border: "#FCD34D" };
    case "Low":
      return { bg: "#FFF1F2", text: "#9F1239", border: "#FDA4AF" };

    // Job-role maturity scale (MATURITY_4)
    case "Expert":
      return { bg: "#F5F3FF", text: "#5B21B6", border: "#C4B5FD" };
    case "Proficient":
      return { bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" };
    case "Intermediate":
      return { bg: "#EFF6FF", text: "#1D4EDB", border: "#93C5FD" };
    case "Developing":
      return { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" };

    default:
      return { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1" };
  }
}

// Plain nested block (no position:absolute, no Tailwind space-y/variable utilities) —
// html2canvas has repeatedly mis-rasterized those on this page (fine on-screen, broken in
// the exported PDF only), so this component sticks to the most basic layout primitives.
function ScoreBar({ score, max = 10, color }: { score: number; max?: number; color: string }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div style={{ height: 10, width: "100%", overflow: "hidden", borderRadius: 9999, backgroundColor: "#E2E8F0" }}>
      <div style={{ height: 10, width: `${pct}%`, borderRadius: 9999, backgroundColor: color }} />
    </div>
  );
}

function CompetencyNumberBadge({ number, color }: { number: number; color: string }) {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" aria-label={`Competency ${number}`}>
      <circle cx="16" cy="16" r="16" fill={color} />
      <text
        x="16"
        y="16"
        fill="#ffffff"
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

function BandBadge({ band, colors }: { band: string; colors: ReturnType<typeof bandColor> }) {
  return (
    <svg className="h-7 w-24 shrink-0" viewBox="0 0 96 28" aria-label={band}>
      <rect x="0.5" y="0.5" width="95" height="27" rx="13.5" fill={colors.bg} stroke={colors.border} />
      <text
        x="48"
        y="14"
        fill={colors.text}
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {band}
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
        <p className="text-sm text-[#94A3B8]">No competency scores available for this assessment.</p>
      </div>
    );
  }

  return (
    <div>
      {showOverview && (<>
      {/* Heading */}
      <div className="border-b-2 pb-2" style={{ borderColor: theme.primary, marginBottom: 24 }}>
        <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: theme.primary }}>
          {heading}
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Scores are on a 1–10 scale derived from candidate responses mapped to each competency.
        </p>
      </div>

      {/* Score overview bar chart */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="mb-3 text-xs font-semibold text-[#475569] uppercase tracking-wide">Score Overview</h3>
        <div>
          {[...competencies]
            .sort((a, b) => b.scaledScore - a.scaledScore)
            .map((c) => {
              const colors = bandColor(c.band);
              return (
                <div key={c.competencyId} style={{ marginBottom: 10 }}>
                  <div className="flex items-center gap-4" style={{ marginBottom: 6 }}>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#0F172A]">{c.competencyName}</span>
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <span className="text-sm font-bold leading-none" style={{ color: theme.primary }}>
                        {c.scaledScore.toFixed(1)}<span className="text-xs font-normal text-[#94A3B8]">/10</span>
                      </span>
                      <BandBadge band={c.band} colors={colors} />
                    </span>
                  </div>
                  <ScoreBar score={c.scaledScore} color={theme.primary} />
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
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#94A3B8]" style={{ marginBottom: 24 }}>{domainName}</p>
            )}
            {group.map((c, idx) => {
              const colors = bandColor(c.band);
              return (
                <div key={c.competencyId} data-pdf-break-inside="avoid" style={{ marginBottom: idx < group.length - 1 ? 24 : 0 }}>
                  {/* Full-bleed header strip */}
                  <div
                    className="-mx-10 flex items-center justify-between gap-4 px-10 py-4"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <CompetencyNumberBadge number={detailIndexOffset + idx + 1} color={theme.primary} />
                      <h3 className="min-w-0 font-semibold leading-tight text-[#0F172A]">{c.competencyName}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <span className="text-2xl font-bold leading-none" style={{ color: theme.primary }}>
                        {c.scaledScore.toFixed(1)}
                      </span>
                      <span className="text-sm text-[#94A3B8]">/ 10</span>
                      <BandBadge band={c.band} colors={colors} />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="pt-5">
                    {c.reportDescription && (
                      <p className="text-base leading-relaxed text-[#475569]" style={{ marginBottom: 20 }}>{c.reportDescription}</p>
                    )}

                    {/* Band-specific proficiency description (Job Role frameworks) */}
                    {c.bandContent ? (
                      <div style={{ marginBottom: 20 }}>
                        <p className="text-base leading-relaxed text-[#475569]" style={{ marginBottom: 16 }}>{c.bandContent.proficiencyDescription}</p>
                        {c.bandContent.behaviouralImplications.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">Behavioural Implications</p>
                            <ul className="list-disc pl-5 text-sm text-[#334155]">
                              {c.bandContent.behaviouralImplications.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
                            </ul>
                          </div>
                        )}
                        {c.bandContent.watchOuts.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">Watch-outs</p>
                            <ul className="list-disc pl-5 text-sm text-[#334155]">
                              {c.bandContent.watchOuts.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Generic band interpretation fallback (legacy competencies) */
                      <div className="rounded-md border-l-4 pl-3 py-1" style={{ borderColor: colors.border, marginBottom: 20 }}>
                        <p className="text-sm text-[#64748B]">
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
                      <p className="rounded-md bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]" style={{ marginBottom: 20 }}>
                        {c.scaledScore > 6.5 ? c.strengthStatement : c.developmentNeedStatement}
                      </p>
                    )}

                    {/* On-the-job development projects */}
                    {developmentProjectCompetencyIds.has(c.competencyId) &&
                      c.developmentProjects &&
                      c.developmentProjects.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
                          On-the-Job Development Projects
                        </p>
                        <div className="flex gap-3">
                          {c.developmentProjects.map((p, i) => (
                            <div key={i} className="min-w-0 flex-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                              <p className="text-sm font-bold text-[#0F172A]">{p.title}</p>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">What to do</p>
                              <p className="whitespace-pre-line text-xs text-[#475569]">{p.whatToDo}</p>
                              {p.howToDoIt && (
                                <>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">How to do it</p>
                                  <p className="whitespace-pre-line text-xs text-[#475569]">{p.howToDoIt}</p>
                                </>
                              )}
                              {p.evidence && (
                                <>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">How to measure</p>
                                  <p className="whitespace-pre-line text-xs text-[#475569]">{p.evidence}</p>
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
