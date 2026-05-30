import type { ReportTemplateType } from "@/generated/prisma/enums";
import { REPORT_TEMPLATE_LABELS, UNIMPLEMENTED_REPORT_TEMPLATE_TYPES } from "@/lib/report-layout";
import { reportTheme } from "@/components/reports/report-theme";

export function ReportTemplatePlaceholderPage({ reportTemplateType }: { reportTemplateType: ReportTemplateType }) {
  const title = REPORT_TEMPLATE_LABELS[reportTemplateType] ?? reportTemplateType;
  const isKnownUnimplemented = UNIMPLEMENTED_REPORT_TEMPLATE_TYPES.includes(reportTemplateType);

  return (
    <div
      className="flex min-h-[60vh] flex-col justify-center px-8 py-12"
      role="status"
      aria-live="polite"
      aria-label="Report template not available"
    >
      <p className="text-sm font-medium uppercase tracking-wide" style={{ color: reportTheme.accent }}>
        Report template
      </p>
      <h2 className="mt-2 text-2xl font-semibold" style={{ color: reportTheme.primary }}>
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: reportTheme.secondary }}>
        {isKnownUnimplemented
          ? "This report layout is not implemented yet. Once it ships, completed attempts will render here automatically."
          : "This template is not wired to a placeholder or layout yet. Choose another report template in the assessment builder, or contact support."}
      </p>
      <p className="mt-6 text-xs font-mono text-slate-500">{reportTemplateType}</p>
    </div>
  );
}
