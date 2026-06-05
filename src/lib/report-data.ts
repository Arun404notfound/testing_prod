import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentType, ReportTemplateType } from "@/generated/prisma/enums";
import {
  inferReportTemplateTypeFromAssessmentType,
  reconcileDefaultTechnicalWithAssessmentType,
} from "@/lib/report-layout";
import { tenantRowToBranding, type ReportTenantBranding } from "@/lib/report-branding";

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
  score: number;
  maxScore: number;
  percent: number;
};

export type ReportCompetencyScore = {
  competencyId: string;
  competencyName: string;
  scaledScore: number;
  percent: number;
  band: string;
  reportDescription: string | null;
  scoringFormula: string;
  attributes: Array<{ code: string; name: string }>;
};

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
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function aggregateFactors(traits: ReportTraitScoreRow[]): ReportFactorAggregate[] {
  const map = new Map<string, { score: number; max: number }>();
  for (const t of traits) {
    const prev = map.get(t.factor) ?? { score: 0, max: 0 };
    prev.score += t.score;
    prev.max += t.maxScore;
    map.set(t.factor, prev);
  }
  return Array.from(map.entries()).map(([factor, agg]) => ({
    factor,
    score: agg.score,
    maxScore: agg.max,
    percent: agg.max > 0 ? Math.round((agg.score / agg.max) * 1000) / 10 : 0,
  }));
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
      assessment: { include: { tenant: true } },
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
          traitScores: { orderBy: { factor: "asc" } },
          competencyScores: {
            include: {
              competency: {
                include: {
                  attributeMaps: { include: { attribute: { select: { code: true, name: true } } } },
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

  const factorAggregates = aggregateFactors(traitScores);

  // Build competency scores
  const competencyScores: ReportCompetencyScore[] = (attempt?.competencyScores ?? []).map((cs) => ({
    competencyId: cs.competencyId,
    competencyName: cs.competency.name,
    scaledScore: cs.scaledScore,
    percent: cs.percent,
    band: cs.band ?? "Moderate",
    reportDescription: cs.competency.reportDescription ?? null,
    scoringFormula: cs.competency.scoringFormula ?? "WEIGHTED_AVERAGE",
    attributes: cs.competency.attributeMaps.map((m) => ({ code: m.attribute.code, name: m.attribute.name })),
  }));

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
