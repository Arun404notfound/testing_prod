import type { AssessmentType, ModuleType } from "@/generated/prisma/enums";

export const POOL_LIKERT_ASSESSMENT_TITLE = "Imported Likert Items";
export const POOL_TRIAD_ASSESSMENT_TITLE = "Imported Triad Bank";

// These five predicates originally gated pooling by the legacy per-assessment
// AssessmentType (KNOWLEDGE_MCQ/LIKERT_PSYCHOMETRIC/FORCED_CHOICE_TRIAD/HYBRID),
// which meant a fresh Psychometric module (assessmentType defaults to
// KNOWLEDGE_MCQ) only ever unlocked MCQ/SJT/Case Study — Likert and Triad were
// invisible unless an admin happened to pick HYBRID at creation. Module
// (Psychometric/Technical/Survey) is the real classifier now, so every
// Psychometric assessment can pool all five item types unconditionally; the
// `type` parameter is kept only so every existing call site stays unchanged.
export function allowsMcqPool(_type: AssessmentType): boolean {
  return true;
}

export function allowsLikertPool(_type: AssessmentType): boolean {
  return true;
}

export function allowsTriadPool(_type: AssessmentType): boolean {
  return true;
}

export function allowsSjtPool(_type: AssessmentType): boolean {
  return true;
}

export function allowsCaseStudyPool(_type: AssessmentType): boolean {
  return true;
}

// ─── Technical / Survey pools (keyed on moduleType, not the legacy AssessmentType) ──
// Additive alongside the five predicates above, which stay Psychometric-only and untouched.

export function allowsTechnicalMcqPool(moduleType: ModuleType): boolean {
  return moduleType === "TECHNICAL";
}

export function allowsOpenEndedPool(moduleType: ModuleType): boolean {
  return moduleType === "TECHNICAL" || moduleType === "SURVEY";
}

export function allowsSurveyLikertPool(moduleType: ModuleType): boolean {
  return moduleType === "SURVEY";
}
