import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentType, ReportTemplateType } from "@/generated/prisma/enums";
import {
  inferReportTemplateTypeFromAssessmentType,
  reconcileDefaultTechnicalWithAssessmentType,
} from "@/lib/report-layout";
import { tenantRowToBranding, type ReportTenantBranding } from "@/lib/report-branding";
import { computeCompetencyScores, type CompetencyMap, type AttributeScoreInput } from "@/lib/scoring/competencyEngine";

type GroupedQuestion = {
  category: string;
  items: Array<{
    id: string;
    questionText: string;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
    explanation: string;
    options: [string, string, string, string];
  }>;
};

export type ReportAttemptResponseRow = {
  id: string;
  kind: "likert" | "mcq" | "triad";
  prompt: string | null;
  itemType: string | null;
  triadGroupTitle: string | null;
  mostStatement: string | null;
  leastStatement: string | null;
  likertRating: number | null;
  scoredValue: number | null;
  isCorrect: boolean | null;
};

export type ReportTraitScoreRow = {
  factor: string;
  trait: string;
  definition: string;
  score: number;
  maxScore: number;
  percent: number;
};

export type ReportFactorAggregate = {
  factor: string;
  displayName: string | null;
  score: number;
  maxScore: number;
  percent: number;
  scaledScore: number | null;   // 1–10 if factor config with attribute mapping exists
  band: string | null;
  scoringFormula: string | null;
  attributes: Array<{ name: string; weight: number; score: number; maxScore: number }>;
};

export type ReportCompetencyScore = {
  competencyId: string;
  competencyName: string;
  domainName: string | null;
  scaledScore: number;
  percent: number;
  band: string;
  reportDescription: string | null;
  scoringFormula: string;
  attributes: Array<{ code: string; name: string }>;
  strengthStatement: string | null;
  developmentNeedStatement: string | null;
  bandContent: {
    proficiencyDescription: string;
    behaviouralImplications: string[];
    watchOuts: string[];
  } | null;
  developmentProjects: Array<{ title: string; whatToDo: string; howToDoIt: string; evidence: string }>;
  /** Median scaled score (1–10) across other completed attempts on the same module (scoped to the same Program when this attempt was taken as part of one). Null when the cohort is too small to be meaningful. */
  medianScaledScore: number | null;
  /** Number of other completed attempts the median was computed from (0 when medianScaledScore is null). */
  cohortSize: number;
};

/** Below this, a "median" is more noise than signal — the radar chart falls back to candidate-only. */
const MIN_COHORT_SIZE_FOR_MEDIAN = 3;

/**
 * Median (not average) scaled competency score across every other completed attempt on the same
 * assessment/module. When `programId` is set, the cohort is further restricted to attempts taken
 * as part of that same Program — the same module can be reused across unrelated Programs, and
 * candidates from a different Program shouldn't be pooled into "the cohort" for this one.
 */
async function getCohortMedianCompetencyScores(
  assessmentId: string,
  excludeAttemptId: string,
  programId: string | null,
): Promise<Map<string, { median: number; cohortSize: number }>> {
  const rows = await prisma.competencyScore.findMany({
    where: {
      attempt: {
        assessmentId,
        status: "SCORED",
        id: { not: excludeAttemptId },
        ...(programId ? { assignment: { programAssignment: { programId } } } : {}),
      },
    },
    select: { competencyId: true, scaledScore: true },
  });

  const byCompetency = new Map<string, number[]>();
  for (const r of rows) {
    const arr = byCompetency.get(r.competencyId) ?? [];
    arr.push(r.scaledScore);
    byCompetency.set(r.competencyId, arr);
  }

  const result = new Map<string, { median: number; cohortSize: number }>();
  for (const [competencyId, scores] of byCompetency) {
    if (scores.length < MIN_COHORT_SIZE_FOR_MEDIAN) continue;
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    result.set(competencyId, { median, cohortSize: scores.length });
  }
  return result;
}

export type ReportPayload = {
  id: string;
  assessmentType: AssessmentType;
  reportTemplateType: ReportTemplateType;
  assessmentName: string;
  completedAt: string;
  overallScore: number;
  strengths: string[];
  areasOfConcern: string[];
  candidateName: string;
  candidateRole: string;
  tenantName: string | null;
  sectionScores: Array<{
    sectionName: string;
    score: number;
    maxScore: number;
    summary: string;
  }>;
  groupedQuestionReview: Record<string, GroupedQuestion[]>;
  traitScores: ReportTraitScoreRow[];
  factorAggregates: ReportFactorAggregate[];
  attemptId: string | null;
  submissionType: string | null;
  attemptResponses: ReportAttemptResponseRow[];
  tenantBranding: ReportTenantBranding;
  competencyScores: ReportCompetencyScore[];
  jobRoleName: string | null;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

type FactorConfigRow = {
  factor: string;
  displayName: string | null;
  scoringFormula: string;
  attributeMaps: Array<{
    weight: number;
    attribute: { id: string; name: string };
  }>;
};

function aggregateFactors(
  traits: ReportTraitScoreRow[],
  factorConfigs: FactorConfigRow[],
  attributeScores: AttributeScoreInput[],
): ReportFactorAggregate[] {
  // Build raw factor sums from trait scores (always available as fallback)
  const rawMap = new Map<string, { score: number; max: number }>();
  for (const t of traits) {
    const prev = rawMap.get(t.factor) ?? { score: 0, max: 0 };
    prev.score += t.score;
    prev.max += t.maxScore;
    rawMap.set(t.factor, prev);
  }

  // Build a config lookup by factor name
  const configByFactor = new Map<string, FactorConfigRow>();
  for (const fc of factorConfigs) configByFactor.set(fc.factor, fc);

  // Build attribute score lookup
  const attrScoreMap = new Map<string, AttributeScoreInput>();
  for (const a of attributeScores) attrScoreMap.set(a.attributeId, a);

  // Collect all factors — from configs first, then any extra from traits
  const factorNames = new Set<string>([
    ...factorConfigs.map((fc) => fc.factor),
    ...rawMap.keys(),
  ]);

  const results: ReportFactorAggregate[] = [];

  for (const factor of factorNames) {
    const raw = rawMap.get(factor) ?? { score: 0, max: 0 };
    const config = configByFactor.get(factor);

    // If a config with attribute mappings exists, use computeCompetencyScores for scaled score
    let scaledScore: number | null = null;
    let band: string | null = null;
    const attributesDetail: Array<{ name: string; weight: number; score: number; maxScore: number }> = [];

    if (config && config.attributeMaps.length > 0) {
      const compMap: CompetencyMap = {
        competencyId: factor,
        competencyName: factor,
        scoringFormula: config.scoringFormula,
        attributes: config.attributeMaps.map((m) => ({
          attributeId: m.attribute.id,
          weight: m.weight,
        })),
      };
      const [result] = computeCompetencyScores(attributeScores, [compMap]);
      if (result) {
        scaledScore = result.scaledScore;
        band = result.band;
      }
      for (const m of config.attributeMaps) {
        const as = attrScoreMap.get(m.attribute.id);
        attributesDetail.push({
          name: m.attribute.name,
          weight: m.weight,
          score: as?.rawScore ?? 0,
          maxScore: as?.maxScore ?? 0,
        });
      }
    }

    const percent = raw.max > 0 ? Math.round((raw.score / raw.max) * 1000) / 10 : 0;

    results.push({
      factor,
      displayName: config?.displayName ?? null,
      score: raw.score,
      maxScore: raw.max,
      percent,
      scaledScore,
      band,
      scoringFormula: config?.scoringFormula ?? null,
      attributes: attributesDetail,
    });
  }

  return results.sort((a, b) => a.factor.localeCompare(b.factor));
}

function deriveFromTraits(traits: ReportTraitScoreRow[]): { strengths: string[]; concerns: string[] } {
  if (traits.length === 0) return { strengths: [], concerns: [] };
  const sorted = [...traits].sort((a, b) => b.percent - a.percent);
  const strengths = sorted.slice(0, 2).map((t) => `Strong signal on ${t.trait} (${t.factor}) at ${t.percent}%.`);
  const low = [...traits].sort((a, b) => a.percent - b.percent).slice(0, 2);
  const concerns = low.map((t) => `Development area: ${t.trait} (${t.factor}) at ${t.percent}%.`);
  return { strengths, concerns };
}

export type ReportAccess =
  | { kind: "portal"; portalTenantId: string }
  | { kind: "candidate"; candidateId: string };

export async function getReportPayload(
  resultId: string,
  access?: ReportAccess,
): Promise<ReportPayload | null> {
  const portalTenantId = access?.kind === "portal" ? access.portalTenantId : await getDefaultTenantId();
  const where =
    access?.kind === "candidate"
      ? { id: resultId, candidateId: access.candidateId }
      : { id: resultId, candidate: { tenantId: portalTenantId } };

  const result = await prisma.assessmentResult.findFirst({
    where,
    include: {
      candidate: { include: { tenant: true } },
      assessment: { include: { tenant: true, jobRole: { select: { name: true } } } },
      sectionScores: true,
      questionResponses: {
        include: { question: true },
      },
    },
  });

  if (!result) return null;

  const assessmentType = (result.assessment?.assessmentType ?? "KNOWLEDGE_MCQ") as AssessmentType;
  const rawTemplate: ReportTemplateType =
    result.assessment?.reportTemplateType ?? inferReportTemplateTypeFromAssessmentType(assessmentType);
  const reportTemplateType = reconcileDefaultTechnicalWithAssessmentType(rawTemplate, assessmentType);
  const tenantName = result.assessment?.tenant?.name ?? result.candidate.tenant?.name ?? null;
  /* Branding: assessment tenant first, then candidate; tenantRowToBranding(null) applies platform defaults. */
  const tenantBranding = tenantRowToBranding(result.assessment?.tenant ?? result.candidate?.tenant);

  const attempt = result.assignmentId
    ? await prisma.assessmentAttempt.findFirst({
        where: {
          assignmentId: result.assignmentId,
          candidateId: result.candidateId,
          ...(result.assessmentId ? { assessmentId: result.assessmentId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          assignment: { select: { programAssignment: { select: { programId: true } } } },
          traitScores: { orderBy: { factor: "asc" } },
          competencyScores: {
            include: {
              competency: {
                include: {
                  attributeMaps: { include: { attribute: { select: { code: true, name: true } } } },
                  domain: { select: { name: true } },
                  bandContents: true,
                  developmentProjects: { orderBy: { displayOrder: "asc" } },
                },
              },
            },
            orderBy: { scaledScore: "desc" },
          },
          responses: {
            include: {
              item: true,
              itemOption: true,
              triadGroup: true,
              triadMostStatement: true,
              triadLeastStatement: true,
            },
          },
        },
      })
    : null;

  const traitScores: ReportTraitScoreRow[] = (attempt?.traitScores ?? []).map((t) => ({
    factor: t.factor,
    trait: t.trait,
    definition: t.definition,
    score: t.score,
    maxScore: t.maxScore ?? 0,
    percent: t.percent ?? 0,
  }));

  const attemptResponses: ReportAttemptResponseRow[] = (attempt?.responses ?? []).map((r) => {
    if (
      r.triadGroupId &&
      r.triadMostStatementId &&
      r.triadLeastStatementId &&
      r.triadMostStatement &&
      r.triadLeastStatement
    ) {
      return {
        id: r.id,
        kind: "triad" as const,
        prompt: null,
        itemType: "TRIAD",
        triadGroupTitle: r.triadGroup?.title ?? r.triadGroup?.triadGroupCode ?? "Triad",
        mostStatement: r.triadMostStatement.statementText,
        leastStatement: r.triadLeastStatement.statementText,
        likertRating: null,
        scoredValue: r.scoredValue ?? r.rawScore ?? null,
        isCorrect: null,
      };
    }
    if (r.itemId && r.item) {
      const isLikert = r.item.itemType === "LIKERT";
      return {
        id: r.id,
        kind: isLikert ? ("likert" as const) : ("mcq" as const),
        prompt: r.item.prompt,
        itemType: r.item.itemType,
        triadGroupTitle: null,
        mostStatement: null,
        leastStatement: null,
        likertRating: isLikert ? r.numericValue ?? null : null,
        scoredValue: r.scoredValue ?? r.rawScore ?? null,
        isCorrect: r.isCorrect ?? null,
      };
    }
    return {
      id: r.id,
      kind: "mcq" as const,
      prompt: null,
      itemType: null,
      triadGroupTitle: null,
      mostStatement: null,
      leastStatement: null,
      likertRating: null,
      scoredValue: r.scoredValue ?? null,
      isCorrect: r.isCorrect ?? null,
    };
  });

  const groupedBySection = result.questionResponses.reduce<Record<string, GroupedQuestion[]>>((acc, response) => {
    const section = response.question.section;
    const category = response.question.category;
    const sectionGroups = acc[section] ?? [];
    let categoryGroup = sectionGroups.find((group) => group.category === category);
    if (!categoryGroup) {
      categoryGroup = { category, items: [] };
      sectionGroups.push(categoryGroup);
      acc[section] = sectionGroups;
    }

    categoryGroup.items.push({
      id: response.id,
      questionText: response.question.questionText,
      selectedOption: response.selectedOption,
      correctOption: response.question.correctOption,
      isCorrect: response.isCorrect,
      explanation: response.question.explanation,
      options: [
        response.question.option1,
        response.question.option2,
        response.question.option3,
        response.question.option4,
      ],
    });

    return acc;
  }, {});

  let strengths = asStringArray(result.strengths);
  let areasOfConcern = asStringArray(result.areasOfConcern);
  if (strengths.length === 0 && traitScores.length > 0) {
    const d = deriveFromTraits(traitScores);
    strengths = d.strengths;
    areasOfConcern = d.concerns;
  }

  // Fetch Big Five factor configs for this tenant
  const factorConfigs = await prisma.bigFiveFactorConfig.findMany({
    where: { tenantId: portalTenantId },
    include: {
      attributeMaps: {
        include: { attribute: { select: { id: true, name: true, code: true } } },
        orderBy: { weight: "desc" },
      },
    },
  });

  // Build attribute scores from trait scores (by trait name → attribute name match)
  const attrScoreMap = new Map<string, { rawScore: number; maxScore: number }>();
  for (const t of (attempt?.traitScores ?? [])) {
    const prev = attrScoreMap.get(t.trait) ?? { rawScore: 0, maxScore: 0 };
    prev.rawScore += t.score;
    prev.maxScore += t.maxScore ?? 0;
    attrScoreMap.set(t.trait, prev);
  }
  const attributeScoresForFactors: AttributeScoreInput[] = [];
  for (const fc of factorConfigs) {
    for (const m of fc.attributeMaps) {
      const existing = attributeScoresForFactors.find((a) => a.attributeId === m.attribute.id);
      if (!existing) {
        const raw = attrScoreMap.get(m.attribute.name) ?? { rawScore: 0, maxScore: 0 };
        attributeScoresForFactors.push({
          attributeId: m.attribute.id,
          attributeName: m.attribute.name,
          rawScore: raw.rawScore,
          maxScore: raw.maxScore,
        });
      }
    }
  }

  const factorAggregates = aggregateFactors(traitScores, factorConfigs, attributeScoresForFactors);

  // Cohort median (other candidates who took the same module as part of the same Program, or —
  // for a standalone assessment — other candidates on the same assessment) for the radar chart.
  const cohortMedianByCompetency =
    attempt && result.assessmentId
      ? await getCohortMedianCompetencyScores(
          result.assessmentId,
          attempt.id,
          attempt.assignment?.programAssignment?.programId ?? null,
        )
      : new Map<string, { median: number; cohortSize: number }>();

  // Build competency scores
  const competencyScores: ReportCompetencyScore[] = (attempt?.competencyScores ?? []).map((cs) => {
    const band = cs.band ?? "Moderate";
    const bandContentRow = cs.competency.bandContents.find((b) => b.band === band) ?? null;
    const cohort = cohortMedianByCompetency.get(cs.competencyId) ?? null;
    return {
      competencyId: cs.competencyId,
      competencyName: cs.competency.name,
      domainName: cs.competency.domain?.name ?? null,
      scaledScore: cs.scaledScore,
      percent: cs.percent,
      band,
      reportDescription: cs.competency.reportDescription ?? null,
      scoringFormula: cs.competency.scoringFormula ?? "WEIGHTED_AVERAGE",
      attributes: cs.competency.attributeMaps.map((m) => ({ code: m.attribute.code, name: m.attribute.name })),
      strengthStatement: cs.competency.strengthStatement ?? null,
      developmentNeedStatement: cs.competency.developmentNeedStatement ?? null,
      bandContent: bandContentRow
        ? {
            proficiencyDescription: bandContentRow.proficiencyDescription,
            behaviouralImplications: bandContentRow.behaviouralImplications.split("\n").filter(Boolean),
            watchOuts: bandContentRow.watchOuts.split("\n").filter(Boolean),
          }
        : null,
      developmentProjects: cs.competency.developmentProjects.map((p) => ({
        title: p.title,
        whatToDo: p.whatToDo,
        howToDoIt: p.howToDoIt,
        evidence: p.evidence,
      })),
      medianScaledScore: cohort?.median ?? null,
      cohortSize: cohort?.cohortSize ?? 0,
    };
  });

  return {
    id: result.id,
    assessmentType,
    reportTemplateType,
    assessmentName: result.assessment?.title ?? result.assessmentName,
    completedAt: result.completedAt.toISOString(),
    overallScore: result.overallScore,
    strengths,
    areasOfConcern,
    candidateName: result.candidate.fullName,
    candidateRole: result.candidate.designation,
    tenantName,
    sectionScores: result.sectionScores.map((score) => ({
      sectionName: score.sectionName,
      score: score.score,
      maxScore: score.maxScore,
      summary: score.summary,
    })),
    groupedQuestionReview: groupedBySection,
    traitScores,
    factorAggregates,
    attemptId: attempt?.id ?? null,
    submissionType: attempt?.submissionType ?? null,
    attemptResponses,
    tenantBranding,
    competencyScores,
    jobRoleName: result.assessment?.jobRole?.name ?? null,
  };
}

export async function getLatestReportPayload() {
  const tenantId = await getDefaultTenantId();
  const latest = await prisma.assessmentResult.findFirst({
    where: {
      candidate: { tenantId },
    },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });
  if (!latest) return null;
  return getReportPayload(latest.id, { kind: "portal", portalTenantId: tenantId });
}
