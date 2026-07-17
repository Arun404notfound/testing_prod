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

function ScoreGauge({ score, max = 10, color }: { score: number; max?: number; color: string }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-12 text-right text-sm font-bold" style={{ color }}>
        {score.toFixed(1)}<span className="text-xs font-normal text-[#94A3B8]">/10</span>
      </span>
    </div>
  );
}

export function CompetencyReportPage({ competencies, heading = "Competency Profile" }: Props) {
  const { theme } = useReportTheme();

  if (competencies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#94A3B8]">No competency scores available for this assessment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: theme.primary }}>
          {heading}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Scores are on a 1–10 scale derived from candidate responses mapped to each competency.
        </p>
      </div>

      {/* Score overview bar chart */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#475569] uppercase tracking-wide">Score Overview</h3>
        <div className="space-y-3">
          {[...competencies]
            .sort((a, b) => b.scaledScore - a.scaledScore)
            .map((c) => {
              const colors = bandColor(c.band);
              return (
                <div key={c.competencyId}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#0F172A]">{c.competencyName}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                    >
                      {c.band}
                    </span>
                  </div>
                  <ScoreGauge score={c.scaledScore} color={theme.primary} />
                </div>
              );
            })}
        </div>
      </div>

      {/* Detailed competency cards, grouped by Domain when present */}
      <div className="space-y-6">
        {groupByDomain(competencies).map(([domainName, group]) => (
          <div key={domainName ?? "__ungrouped"} className="space-y-4">
            {domainName && (
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#94A3B8]">{domainName}</h3>
            )}
            {group.map((c, idx) => {
              const colors = bandColor(c.band);
              return (
                <div
                  key={c.competencyId}
                  className="overflow-hidden rounded-xl border bg-white"
                  style={{ borderColor: colors.border }}
                  data-pdf-break-inside="avoid"
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: theme.primary }}
                      >
                        {idx + 1}
                      </div>
                      <h3 className="font-semibold text-[#0F172A]">{c.competencyName}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold" style={{ color: theme.primary }}>
                        {c.scaledScore.toFixed(1)}
                      </span>
                      <span className="text-sm text-[#94A3B8]">/ 10</span>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                      >
                        {c.band}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-4">
                    {c.reportDescription && (
                      <p className="text-sm leading-relaxed text-[#475569]">{c.reportDescription}</p>
                    )}

                    {/* Attribute subscales */}
                    {c.attributes && c.attributes.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                          Subscale Attributes
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {c.attributes.map((a) => (
                            <div
                              key={a.code}
                              className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2"
                            >
                              <span className="font-mono text-xs font-bold text-[#2563EB]">{a.code}</span>
                              <span className="text-xs text-[#334155]">{a.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Band-specific proficiency description (Job Role frameworks) */}
                    {c.bandContent ? (
                      <div className="space-y-3">
                        <p className="text-sm leading-relaxed text-[#475569]">{c.bandContent.proficiencyDescription}</p>
                        {c.bandContent.behaviouralImplications.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Behavioural Implications</p>
                            <ul className="list-disc space-y-0.5 pl-4 text-xs text-[#334155]">
                              {c.bandContent.behaviouralImplications.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                          </div>
                        )}
                        {c.bandContent.watchOuts.length > 0 && (
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Watch-outs</p>
                            <ul className="list-disc space-y-0.5 pl-4 text-xs text-[#334155]">
                              {c.bandContent.watchOuts.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Generic band interpretation fallback (legacy competencies) */
                      <div className="rounded-md border-l-4 pl-3 py-1" style={{ borderColor: colors.border }}>
                        <p className="text-xs text-[#64748B]">
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
                      <p className="rounded-md bg-[#F8FAFC] px-3 py-2 text-xs text-[#334155]">
                        {c.scaledScore > 6.5 ? c.strengthStatement : c.developmentNeedStatement}
                      </p>
                    )}

                    {/* On-the-job development projects */}
                    {c.developmentProjects && c.developmentProjects.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                          On-the-Job Development Projects
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {c.developmentProjects.map((p, i) => (
                            <div key={i} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                              <p className="text-xs font-bold text-[#0F172A]">{p.title}</p>
                              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">What to do</p>
                              <p className="whitespace-pre-line text-[11px] text-[#475569]">{p.whatToDo}</p>
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
