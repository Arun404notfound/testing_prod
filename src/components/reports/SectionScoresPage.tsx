"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function SectionScoresPage({
  report,
  heading,
}: {
  report: ReportPayload;
  heading: string;
}) {
  const { theme } = useReportTheme();
  const sectionScores = Array.isArray(report.sectionScores) ? report.sectionScores : [];
  if (sectionScores.length === 0) return null;
  return (
    <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
      <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
        {heading}
      </h3>
      <div className="mt-4 space-y-3">
        {sectionScores.map((section) => {
          const percent = section.maxScore > 0 ? Math.round((section.score / section.maxScore) * 100) : 0;
          return (
            <div key={section.sectionName} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{section.sectionName}</span>
                <span>{percent}%</span>
              </div>
              <div className="h-3 w-full rounded-full" style={{ backgroundColor: "#e5e7eb" }}>
                <div className="h-3 rounded-full" style={{ width: `${percent}%`, backgroundColor: theme.accent }} />
              </div>
              <p className="mt-1 text-xs" style={{ color: theme.secondary }}>
                {section.summary}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-md border p-4" style={{ borderColor: theme.border, backgroundColor: theme.subtleBackground }}>
        <p className="text-sm font-semibold" style={{ color: theme.primary }}>
          Score table
        </p>
        <table className="mt-2 w-full text-left text-sm">
          <thead style={{ color: theme.muted }}>
            <tr>
              <th className="py-1">Section</th>
              <th className="py-1">Score</th>
              <th className="py-1">Summary</th>
            </tr>
          </thead>
          <tbody>
            {sectionScores.map((s) => (
              <tr key={`t-${s.sectionName}`} className="border-t" style={{ borderColor: theme.border }}>
                <td className="py-2">{s.sectionName}</td>
                <td className="py-2">
                  {s.score}/{s.maxScore}
                </td>
                <td className="py-2" style={{ color: theme.secondary }}>
                  {s.summary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
