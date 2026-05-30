import type { AssessmentType, ReportTemplateType } from "@/generated/prisma/enums";

/** Stable order for admin selects and iteration. */
export const REPORT_TEMPLATE_TYPES: ReportTemplateType[] = [
  "TECHNICAL_SKILLS_REPORT",
  "PSYCHOMETRIC_TRAIT_REPORT",
  "FORCED_CHOICE_REPORT",
  "HYBRID_REPORT",
  "SALES_PROFILER_REPORT",
  "SALES_SIMULATION_REPORT",
  "CUSTOM",
];

export const REPORT_TEMPLATE_LABELS: Record<ReportTemplateType, string> = {
  TECHNICAL_SKILLS_REPORT: "Technical skills (MCQ-style)",
  PSYCHOMETRIC_TRAIT_REPORT: "Psychometric traits / factors",
  FORCED_CHOICE_REPORT: "Forced-choice (triad) profile",
  HYBRID_REPORT: "Hybrid (knowledge + psychometric)",
  SALES_PROFILER_REPORT: "Sales profiler (coming soon)",
  SALES_SIMULATION_REPORT: "Sales simulation (coming soon)",
  CUSTOM: "Custom · layout follows assessment type",
};

const REPORT_TEMPLATE_TYPE_SET = new Set<string>(REPORT_TEMPLATE_TYPES);

export function isReportTemplateType(value: string): value is ReportTemplateType {
  return REPORT_TEMPLATE_TYPE_SET.has(value);
}

/** Templates that intentionally show the “not implemented yet” placeholder page. */
export const UNIMPLEMENTED_REPORT_TEMPLATE_TYPES: ReportTemplateType[] = [
  "SALES_PROFILER_REPORT",
  "SALES_SIMULATION_REPORT",
];

/**
 * Which PDF / screen stack to render. Add a branch in the report client when you introduce
 * a new concrete layout.
 */
export type ReportLayoutKind =
  | "technical_skills"
  | "psychometric_trait"
  | "triad_forced_choice"
  | "hybrid"
  | "placeholder";

/** Default `reportTemplateType` when creating an assessment from `assessmentType` only. */
export function defaultReportTemplateForAssessmentType(assessmentType: AssessmentType): ReportTemplateType {
  switch (assessmentType) {
    case "KNOWLEDGE_MCQ":
      return "TECHNICAL_SKILLS_REPORT";
    case "LIKERT_PSYCHOMETRIC":
      return "PSYCHOMETRIC_TRAIT_REPORT";
    case "FORCED_CHOICE_TRIAD":
      return "FORCED_CHOICE_REPORT";
    case "HYBRID":
      return "HYBRID_REPORT";
    default:
      return "TECHNICAL_SKILLS_REPORT";
  }
}

/** Back-compat when payloads or rows omit `reportTemplateType`. */
export function inferReportTemplateTypeFromAssessmentType(assessmentType: AssessmentType): ReportTemplateType {
  return defaultReportTemplateForAssessmentType(assessmentType);
}

/**
 * Rows created when `reportTemplateType` defaulted to technical but `assessmentType`
 * is triad or hybrid should behave as the dedicated template. Does not change explicit
 * non-default template choices.
 */
export function reconcileDefaultTechnicalWithAssessmentType(
  stored: ReportTemplateType,
  assessmentType: AssessmentType,
): ReportTemplateType {
  if (stored !== "TECHNICAL_SKILLS_REPORT") return stored;
  if (assessmentType === "FORCED_CHOICE_TRIAD") return "FORCED_CHOICE_REPORT";
  if (assessmentType === "HYBRID") return "HYBRID_REPORT";
  return stored;
}

/** Fallback when `reportTemplateType` is `CUSTOM` (or future extension). */
export function layoutFromAssessmentType(assessmentType: AssessmentType): ReportLayoutKind {
  switch (assessmentType) {
    case "LIKERT_PSYCHOMETRIC":
      return "psychometric_trait";
    case "FORCED_CHOICE_TRIAD":
      return "triad_forced_choice";
    case "HYBRID":
      return "hybrid";
    default:
      return "technical_skills";
  }
}

/**
 * Resolve layout: explicit `reportTemplateType` first; `CUSTOM` defers to `assessmentType`.
 */
export function resolveReportLayout(
  templateType: ReportTemplateType,
  assessmentType: AssessmentType,
): ReportLayoutKind {
  switch (templateType) {
    case "TECHNICAL_SKILLS_REPORT":
      return "technical_skills";
    case "PSYCHOMETRIC_TRAIT_REPORT":
      return "psychometric_trait";
    case "FORCED_CHOICE_REPORT":
      return "triad_forced_choice";
    case "HYBRID_REPORT":
      return "hybrid";
    case "SALES_PROFILER_REPORT":
    case "SALES_SIMULATION_REPORT":
      return "placeholder";
    case "CUSTOM":
      return layoutFromAssessmentType(assessmentType);
    default:
      return layoutFromAssessmentType(assessmentType);
  }
}
