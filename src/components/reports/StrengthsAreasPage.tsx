"use client";

import type { ReportPayload } from "@/lib/report-data";
import type { ReportThemePalette } from "./report-theme";
import { useReportTheme } from "./report-theme-context";

function ReportList({ theme, title, items }: { theme: ReportThemePalette; title: string; items: string[] }) {
  return (
    <div
      className="rounded-md border p-4"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.subtleBackground,
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: theme.muted }}>
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm" style={{ color: theme.secondary }}>
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function StrengthsAreasPage({ report }: { report: ReportPayload }) {
  const { theme } = useReportTheme();
  const strengthsList = Array.isArray(report.strengths) ? report.strengths : [];
  const concernsList = Array.isArray(report.areasOfConcern) ? report.areasOfConcern : [];
  const strengths = strengthsList.length > 0 ? strengthsList : ["None listed."];
  const concerns = concernsList.length > 0 ? concernsList : ["None listed."];
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <ReportList theme={theme} title="Strengths" items={strengths} />
      <ReportList theme={theme} title="Areas of concern" items={concerns} />
    </section>
  );
}
