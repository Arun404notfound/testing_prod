"use client";

import type { ReportPayload } from "@/lib/report-data";
import { REPORT_TEMPLATE_LABELS } from "@/lib/report-layout";
import { useReportTheme } from "./report-theme-context";

function InfoRow({ label, value, inkColor, bodyColor }: { label: string; value: string; inkColor: string; bodyColor: string }) {
  return (
    <p className="text-sm">
      <span className="font-bold" style={{ color: inkColor }}>{label}: </span>
      <span style={{ color: bodyColor }}>{value}</span>
    </p>
  );
}

/** Universal cover page — the actual page 1 for every report layout kind. */
export function CoverPage({
  report,
  completedDate,
}: {
  report: ReportPayload;
  completedDate: string;
}) {
  const { theme, logoUrl, disclaimerText } = useReportTheme();
  const reportTypeLabel = REPORT_TEMPLATE_LABELS[report.reportTemplateType];

  return (
    // Fixed minHeight (not h-full/flex-1 on a percentage basis) so the disclaimer
    // reliably lands near the bottom — percentage heights need a definite ancestor
    // height, which a flex-grown parent doesn't reliably provide. margin-top: auto
    // on the disclaimer does the actual push.
    <div className="flex flex-col" style={{ minHeight: "265mm" }}>
      <div>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mb-16 h-10 max-w-[180px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}

        <h1 className="text-4xl font-extrabold leading-tight" style={{ color: theme.ink }}>
          {report.assessmentName}
        </h1>
        <p className="mt-2 text-lg font-bold" style={{ color: theme.ink }}>
          {reportTypeLabel}
        </p>

        <div className="mt-8 flex flex-col gap-1.5">
          <InfoRow label="Report for" value={report.candidateName} inkColor={theme.ink} bodyColor={theme.body} />
          <InfoRow label="Report Type" value={reportTypeLabel} inkColor={theme.ink} bodyColor={theme.body} />
          <InfoRow label="Date" value={completedDate} inkColor={theme.ink} bodyColor={theme.body} />
          {report.candidateRole && (
            <InfoRow label="Role" value={report.candidateRole} inkColor={theme.ink} bodyColor={theme.body} />
          )}
          {report.tenantName && (
            <InfoRow label="Client" value={report.tenantName} inkColor={theme.ink} bodyColor={theme.body} />
          )}
        </div>
      </div>

      {disclaimerText && (
        <p className="text-center text-[11px]" style={{ color: theme.body, marginTop: "auto" }}>
          {disclaimerText}
        </p>
      )}
    </div>
  );
}
