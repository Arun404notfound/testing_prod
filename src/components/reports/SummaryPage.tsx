"use client";

import type { ReportPayload } from "@/lib/report-data";
import type { ReportThemePalette } from "./report-theme";
import { useReportTheme } from "./report-theme-context";

type Theme = ReportThemePalette;

function SummaryCard({ theme, title, value }: { theme: Theme; title: string; value: string }) {
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
      <p className="text-xs uppercase tracking-wider" style={{ color: theme.muted }}>
        {title}
      </p>
      <p className="mt-1 text-4xl font-bold">{value}</p>
    </div>
  );
}

export function SummaryPage({
  report,
  title,
}: {
  report: ReportPayload;
  title: string;
  /** @deprecated proctoring removed */
  proctoring?: unknown;
  /** @deprecated proctoring removed */
  showProctoring?: boolean;
}) {
  const { theme } = useReportTheme();
  return (
    <section className="rounded-md border p-6" style={{ borderColor: theme.border }}>
      <h3 className="text-lg font-semibold" style={{ color: theme.primary }}>
        {title}
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SummaryCard
          theme={theme}
          title="Overall Score"
          value={`${Math.round(Number.isFinite(report.overallScore) ? report.overallScore : 0)}%`}
        />
        <SummaryCard
          theme={theme}
          title="Assessment"
          value={report.assessmentName}
        />
      </div>
    </section>
  );
}
