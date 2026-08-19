"use client";

import type { ReportPayload } from "@/lib/report-data";
import { REPORT_TEMPLATE_LABELS } from "@/lib/report-layout";
import { useReportTheme } from "./report-theme-context";
import { reportTypography } from "./report-typography";

function InfoRow({
  label,
  value,
  inkColor,
  accentColor,
  borderColor,
  isFirst,
}: {
  label: string;
  value: string;
  inkColor: string;
  accentColor: string;
  borderColor: string;
  isFirst: boolean;
}) {
  return (
    <tr style={{ borderTop: isFirst ? "none" : `1px solid ${borderColor}` }}>
      <td
        style={{
          ...reportTypography.h4,
          width: "9.5rem",
          padding: "0.7rem 1.5rem 0.7rem 0",
          textAlign: "left",
          color: accentColor,
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </td>
      <td style={{ ...reportTypography.bodySmall, padding: "0.7rem 0", textAlign: "left", fontWeight: 600, color: inkColor }}>
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
  const hasJobRole = Boolean(report.jobRoleName);

  return (
    // Fixed minHeight (not h-full/flex-1 on a percentage basis) so the disclaimer
    // reliably lands near the bottom — percentage heights need a definite ancestor
    // height, which a flex-grown parent doesn't reliably provide. margin-top: auto
    // on the disclaimer does the actual push.
    <div className="relative flex flex-col" style={{ minHeight: "265mm" }}>
      {/*
        Decorative background — bleeds past ReportPageShell's own px-10/py-10
        padding via matching negative insets (same -mx-10 full-bleed trick used
        by the competency header strips) so it reaches the true page edges
        instead of stopping at the content box. Two large, softly blurred,
        slightly rotated squares in the tenant's accent color at very low
        opacity — calmer than a repeating pattern (a dot/line grid read as
        busy and mechanical), closer to an ambient wash of color. Pure CSS,
        so it prints identically to the on-screen preview.
      */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-2.5rem",
          left: "-2.5rem",
          right: "-2.5rem",
          bottom: "-2.5rem",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-16%",
            right: "-12%",
            width: "48%",
            aspectRatio: "1 / 1",
            backgroundColor: theme.accent,
            opacity: 0.07,
            borderRadius: "22%",
            transform: "rotate(16deg)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-18%",
            left: "-10%",
            width: "34%",
            aspectRatio: "1 / 1",
            backgroundColor: theme.accent,
            opacity: 0.06,
            borderRadius: "24%",
            transform: "rotate(-12deg)",
            filter: "blur(48px)",
          }}
        />
      </div>

      <div className="relative flex flex-1 flex-col items-start justify-center text-left" style={{ zIndex: 1 }}>
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
        <div style={{ height: 4, width: 56, borderRadius: 2, backgroundColor: theme.accent, marginTop: "0.75rem" }} />

        <div
          style={{
            marginTop: "2rem",
            background: `linear-gradient(135deg, ${theme.accent}14, ${theme.cardBackground} 60%)`,
            border: `1px solid ${theme.accent}2E`,
            borderLeft: `4px solid ${theme.accent}`,
            borderRadius: 12,
            padding: "1.375rem 1.75rem",
            boxShadow: "0 12px 28px -16px rgba(15, 23, 42, 0.22)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                { label: "Report for", value: report.candidateName },
                hasJobRole ? { label: "Job Role", value: report.jobRoleName as string } : { label: "Report Type", value: reportTypeLabel },
                { label: "Date", value: completedDate },
                ...(report.candidateRole ? [{ label: "Role", value: report.candidateRole }] : []),
                ...(report.tenantName ? [{ label: "Client", value: report.tenantName }] : []),
              ].map((row, i) => (
                <InfoRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  inkColor={theme.ink}
                  accentColor={theme.accent}
                  borderColor={`${theme.accent}1F`}
                  isFirst={i === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {disclaimerText && (
        <p className="relative text-left text-[11px]" style={{ color: theme.body, marginTop: "auto", zIndex: 1 }}>
          {disclaimerText}
        </p>
      )}
    </div>
  );
}
