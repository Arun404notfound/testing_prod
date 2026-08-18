import type { AssessmentType } from "@/generated/prisma/enums";

export const POOL_LIKERT_ASSESSMENT_TITLE = "Imported Likert Items";
export const POOL_TRIAD_ASSESSMENT_TITLE = "Imported Triad Bank";

export function allowsMcqPool(type: AssessmentType): boolean {
  return type === "KNOWLEDGE_MCQ" || type === "HYBRID";
}

export function allowsLikertPool(type: AssessmentType): boolean {
  return type === "LIKERT_PSYCHOMETRIC" || type === "HYBRID";
}

export function allowsTriadPool(type: AssessmentType): boolean {
  return type === "FORCED_CHOICE_TRIAD" || type === "HYBRID";
}

// SJT and Case Study sub-questions are single-best-answer MCQ-shaped items,
// so they pool under the same assessment types as knowledge MCQs.
export function allowsSjtPool(type: AssessmentType): boolean {
  return type === "KNOWLEDGE_MCQ" || type === "HYBRID";
}

export function allowsCaseStudyPool(type: AssessmentType): boolean {
  return type === "KNOWLEDGE_MCQ" || type === "HYBRID";
}
