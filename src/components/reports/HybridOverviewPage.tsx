"use client";

import type { ReportPayload } from "@/lib/report-data";
import { useReportTheme } from "./report-theme-context";

export function HybridOverviewPage({ report }: { report: ReportPayload }) {
  const { theme, logoUrl } = useReportTheme();
  const attemptResponses = Array.isArray(report.attemptResponses) ? report.attemptResponses : [];
  const hasLikert = attemptResponses.some((r) => r.kind === "likert");
  const hasTriad = attemptResponses.some((r) => r.kind === "triad");
  return (
    <section className="flex flex-col items-center text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="mb-8 h-32 max-w-[380px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: theme.muted }}>
        {report.assessmentName}
      </p>
      <h3 className="mt-2 text-2xl font-bold uppercase tracking-wide" style={{ color: theme.primary }}>
        Hybrid Assessment Overview
      </h3>
      <div className="mt-4 h-px w-16" style={{ backgroundColor: theme.primary }} />

      <div className="mx-auto mt-6 max-w-md text-left">
        <p className="text-sm leading-relaxed" style={{ color: theme.secondary }}>
          This report combines knowledge checks with psychometric-style signals where applicable. Section scores
          reflect knowledge domains; trait scores summarize self-report and forced-choice components.
        </p>

        <ul className="mt-4 list-disc pl-5 text-sm" style={{ color: theme.secondary }}>
          <li style={{ marginBottom: 6 }}>Overall score: blended index across included modules.</li>
          <li style={{ marginBottom: 6 }}>Section table: includes knowledge and rating-based sections as labeled.</li>
          {hasLikert ? <li style={{ marginBottom: 6 }}>Likert-style items contributed to trait and competency scores.</li> : null}
          {hasTriad ? <li style={{ marginBottom: 6 }}>Triad selections contributed to trait and competency scores.</li> : null}
        </ul>
      </div>
    </section>
  );
}
