"use client";

import type { ReportPayload } from "@/lib/report-data";
import { REPORT_TEMPLATE_LABELS } from "@/lib/report-layout";
import { useReportTheme } from "./report-theme-context";
import { reportTypography } from "./report-typography";

function InfoRow({
  label,
  value,
  inkColor,
  bodyColor,
  borderColor,
  isFirst,
}: {
  label: string;
  value: string;
  inkColor: string;
  bodyColor: string;
  borderColor: string;
  isFirst: boolean;
}) {
  return (
    <tr style={{ borderTop: isFirst ? "none" : `1px solid ${borderColor}` }}>
      <td style={{ ...reportTypography.tableCell, width: "10rem", padding: "0.625rem 1.5rem 0.625rem 0", textAlign: "left", fontWeight: 700, color: inkColor }}>
        {label}
      </td>
      <td style={{ ...reportTypography.tableCell, padding: "0.625rem 0", textAlign: "left", color: bodyColor }}>
        {value}
      </td>
    </tr>
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
      <div className="flex flex-1 flex-col items-start justify-center text-left">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mb-6 h-20 max-w-[260px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}

        <h1 style={{ ...reportTypography.h1, color: theme.ink }}>
          {report.assessmentName}
        </h1>
        <p style={{ ...reportTypography.h2, color: theme.ink, marginTop: "0.75rem" }}>
          {reportTypeLabel}
        </p>

        <div
          style={{
            marginTop: "2rem",
            backgroundColor: "#F8FAFC",
            border: `1px solid ${theme.hairline}`,
            borderRadius: 8,
            padding: "1.25rem 1.5rem",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
          }}
        >
          <table style={{ ...reportTypography.tableCell, width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                { label: "Report for", value: report.candidateName },
                { label: "Report Type", value: reportTypeLabel },
                { label: "Date", value: completedDate },
                ...(report.candidateRole ? [{ label: "Role", value: report.candidateRole }] : []),
                ...(report.tenantName ? [{ label: "Client", value: report.tenantName }] : []),
              ].map((row, i) => (
                <InfoRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  inkColor={theme.ink}
                  bodyColor={theme.body}
                  borderColor={theme.hairline}
                  isFirst={i === 0}
                />
              ))}
            </tbody>
          </table>
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
