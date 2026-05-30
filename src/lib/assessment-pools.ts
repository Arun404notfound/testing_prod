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
