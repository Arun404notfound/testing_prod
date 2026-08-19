"use client";

import type { ReportTemplateType } from "@/generated/prisma/enums";
import { REPORT_TEMPLATE_LABELS, UNIMPLEMENTED_REPORT_TEMPLATE_TYPES } from "@/lib/report-layout";
import { useReportTheme } from "@/components/reports/report-theme-context";
import { reportTypography } from "@/components/reports/report-typography";

export function ReportTemplatePlaceholderPage({ reportTemplateType }: { reportTemplateType: ReportTemplateType }) {
  const { theme } = useReportTheme();
  const title = REPORT_TEMPLATE_LABELS[reportTemplateType] ?? reportTemplateType;
  const isKnownUnimplemented = UNIMPLEMENTED_REPORT_TEMPLATE_TYPES.includes(reportTemplateType);

  return (
    <div
      className="flex min-h-[60vh] flex-col justify-center px-8 py-12"
      role="status"
      aria-live="polite"
      aria-label="Report template not available"
    >
      <p style={{ ...reportTypography.h4, color: theme.accent }}>
        Report template
      </p>
      <h2 className="mt-2" style={{ ...reportTypography.h2, color: theme.ink }}>
        {title}
      </h2>
      <p className="mt-4 max-w-xl" style={{ ...reportTypography.bodySmall, color: theme.body }}>
        {isKnownUnimplemented
          ? "This report layout is not implemented yet. Once it ships, completed attempts will render here automatically."
          : "This template is not wired to a placeholder or layout yet. Choose another report template in the assessment builder, or contact support."}
      </p>
      <p className="mt-6 font-mono" style={{ ...reportTypography.bodyXSmall, color: theme.body }}>{reportTemplateType}</p>
    </div>
  );
}
