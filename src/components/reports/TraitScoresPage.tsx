"use client";

import type { ReportTraitScoreRow } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function traitCategoryLabel(percent: number): string {
  if (percent <= 34) return "Low";
  if (percent <= 64) return "Moderate";
  if (percent <= 84) return "High";
  return "Very High";
}

const TARGET_COMPETENCIES = [
  {
    competency: "Drive & Execution",
    attributes: [
      "Achievement striving",
      "Self-discipline",
      "Dutifulness",
      "Competence",
      "Energy level",
    ],
  },
  {
    competency: "Communication & Influence",
    attributes: [
      "Sociability",
      "Assertiveness",
      "Warmth",
      "Straightforwardness",
      "Positive emotion",
    ],
  },
  {
    competency: "Collaboration & Empathy",
    attributes: [
      "Trust",
      "Altruism",
      "Compliance",
      "Sympathy",
      "Feelings",
    ],
  },
];

export function TraitScoresPage({
  traits,
  heading,
}: {
  traits: ReportTraitScoreRow[];
  heading: string;
}) {
  const { theme } = useReportTheme();
  
  return (
    <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
      <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
        {heading}
      </h3>
      <table className="mt-4 w-full text-left text-sm">
        <thead style={{ color: theme.muted }}>
          <tr>
            <th className="py-2 pr-2">Competency</th>
            <th className="py-2 pr-2">Trait / attribute</th>
            <th className="py-2 pr-2">Score</th>
            <th className="py-2 pr-2">Max</th>
            <th className="py-2 pr-2">%</th>
            <th className="py-2">Category</th>
          </tr>
        </thead>
        <tbody>
          {TARGET_COMPETENCIES.map((comp) => {
            return comp.attributes.map((attrName, index) => {
              const t = traits.find((trait) => trait.trait === attrName || trait.factor === attrName);
              const score = t?.score ?? 0;
              const maxScore = t?.maxScore ?? 0;
              const pct = t && Number.isFinite(t.percent) ? t.percent : 0;
              const cat = traitCategoryLabel(pct);

              return (
                <tr key={`${comp.competency}-${attrName}`} className="border-t" style={{ borderColor: theme.border }}>
                  {index === 0 && (
                    <td className="py-2 pr-2 font-medium align-top" rowSpan={comp.attributes.length}>
                      {comp.competency}
                    </td>
                  )}
                  <td className="py-2 pr-2">{attrName}</td>
                  <td className="py-2 pr-2">{score}</td>
                  <td className="py-2 pr-2">{maxScore}</td>
                  <td className="py-2 pr-2">{pct}%</td>
                  <td className="py-2">
                    {t ? (
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: theme.accentLight,
                          color: theme.accent,
                        }}
                      >
                        {pct}% — {cat}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: theme.muted }}>N/A</span>
                    )}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs" style={{ color: theme.muted }}>
        Categories: 0–34 Low · 35–64 Moderate · 65–84 High · 85–100 Very High
      </p>
    </section>
  );
}
