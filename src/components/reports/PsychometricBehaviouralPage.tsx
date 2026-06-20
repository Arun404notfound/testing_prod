"use client";

import { useReportTheme } from "./report-theme-context";

const BEHAVIOURAL_INSIGHTS = [
  {
    dimension: "Communication Style",
    insight:
      "Placeholder description of communication style. This will be populated via the report content API and will reflect the candidate's unique profile.",
  },
  {
    dimension: "Team Style",
    insight:
      "Placeholder description of team style. This will be populated via the report content API and will describe how the candidate typically collaborates in group settings.",
  },
  {
    dimension: "Decision-Making Style",
    insight:
      "Placeholder description of decision-making style. This will be populated via the report content API and will outline the candidate's approach to problem-solving and choices.",
  },
  {
    dimension: "Response to Stress",
    insight:
      "Placeholder description of stress response. This will be populated via the report content API and will describe how the candidate tends to manage pressure and uncertainty.",
  },
];

export function PsychometricBehaviouralPage() {
  const { theme } = useReportTheme();

  return (
    <section className="space-y-6 p-2">
      <h3 className="text-base font-bold" style={{ color: theme.primary }}>
        Behavioural Insights
      </h3>
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th className="w-44 py-3 pl-5 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Dimension
              </th>
              <th className="py-3 pl-4 pr-5 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Insight
              </th>
            </tr>
          </thead>
          <tbody>
            {BEHAVIOURAL_INSIGHTS.map((row, i) => (
              <tr key={row.dimension} className={i > 0 ? "border-t border-[#F1F5F9]" : ""}>
                <td className="py-4 pl-5 pr-4 align-top">
                  <span className="font-semibold text-[#0F172A]">{row.dimension}</span>
                </td>
                <td className="py-4 pl-4 pr-5 leading-relaxed text-[#475569]">{row.insight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs italic text-[#9CA3AF]">
        * Behavioural insight text is a placeholder and will be populated via API based on the candidate&apos;s
        individual trait profile.
      </p>
    </section>
  );
}
