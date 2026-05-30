import type { AssessmentType, ReportTemplateType } from "@/generated/prisma/enums";
import { inferReportTemplateTypeFromAssessmentType, isReportTemplateType } from "@/lib/report-layout";
import { tenantRowToBranding, type ReportTenantBranding } from "./report-branding";
import type {
  ReportAttemptResponseRow,
  ReportFactorAggregate,
  ReportPayload,
  ReportTraitScoreRow,
} from "./report-data";

const ASSESSMENT_TYPES = new Set<string>([
  "KNOWLEDGE_MCQ",
  "LIKERT_PSYCHOMETRIC",
  "FORCED_CHOICE_TRIAD",
  "HYBRID",
]);

/**
 * Hardens API/JSON payloads so the report UI never assumes arrays/objects exist.
 * Lives in a Prisma-free module so client pages can import it safely.
 */
export function normalizeReportPayload(data: unknown): ReportPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Partial<ReportPayload> & Record<string, unknown>;
  if (typeof o.id !== "string") return null;

  const assessmentType = (
    typeof o.assessmentType === "string" && ASSESSMENT_TYPES.has(o.assessmentType)
      ? o.assessmentType
      : "KNOWLEDGE_MCQ"
  ) as AssessmentType;

  const reportTemplateTypeRaw = o.reportTemplateType;
  const reportTemplateType: ReportTemplateType =
    typeof reportTemplateTypeRaw === "string" && isReportTemplateType(reportTemplateTypeRaw)
      ? reportTemplateTypeRaw
      : inferReportTemplateTypeFromAssessmentType(assessmentType);

  const groupedQuestionReview =
    o.groupedQuestionReview &&
    typeof o.groupedQuestionReview === "object" &&
    !Array.isArray(o.groupedQuestionReview)
      ? (o.groupedQuestionReview as ReportPayload["groupedQuestionReview"])
      : {};

  const traitScores: ReportTraitScoreRow[] = Array.isArray(o.traitScores)
    ? o.traitScores
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const t = row as Record<string, unknown>;
          if (typeof t.factor !== "string" || typeof t.trait !== "string") return null;
          const score = Number(t.score);
          const maxScore = Number(t.maxScore ?? 0);
          const percent = Number(t.percent ?? 0);
          if (!Number.isFinite(score) || !Number.isFinite(maxScore) || !Number.isFinite(percent)) return null;
          return {
            factor: t.factor,
            trait: t.trait,
            definition: typeof t.definition === "string" ? t.definition : "",
            score,
            maxScore,
            percent,
          };
        })
        .filter((x): x is ReportTraitScoreRow => x !== null)
    : [];

  const factorAggregates: ReportFactorAggregate[] = Array.isArray(o.factorAggregates)
    ? o.factorAggregates
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const f = row as Record<string, unknown>;
          if (typeof f.factor !== "string") return null;
          const score = Number(f.score);
          const maxScore = Number(f.maxScore);
          const percent = Number(f.percent);
          if (!Number.isFinite(score) || !Number.isFinite(maxScore) || !Number.isFinite(percent)) return null;
          return { factor: f.factor, score, maxScore, percent };
        })
        .filter((x): x is ReportFactorAggregate => x !== null)
    : [];

  const sectionScores = Array.isArray(o.sectionScores)
    ? o.sectionScores
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const s = row as Record<string, unknown>;
          if (typeof s.sectionName !== "string" || typeof s.summary !== "string") return null;
          const score = Number(s.score);
          const maxScore = Number(s.maxScore);
          if (!Number.isFinite(score) || !Number.isFinite(maxScore)) return null;
          return { sectionName: s.sectionName, score, maxScore, summary: s.summary };
        })
        .filter((x): x is ReportPayload["sectionScores"][number] => x !== null)
    : [];

  const attemptResponses: ReportAttemptResponseRow[] = Array.isArray(o.attemptResponses)
    ? o.attemptResponses
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          if (typeof r.id !== "string") return null;
          const kind = r.kind;
          if (kind !== "likert" && kind !== "mcq" && kind !== "triad") return null;
          return {
            id: r.id,
            kind,
            prompt: typeof r.prompt === "string" || r.prompt === null ? (r.prompt as string | null) : null,
            itemType: typeof r.itemType === "string" || r.itemType === null ? (r.itemType as string | null) : null,
            triadGroupTitle:
              typeof r.triadGroupTitle === "string" || r.triadGroupTitle === null
                ? (r.triadGroupTitle as string | null)
                : null,
            mostStatement:
              typeof r.mostStatement === "string" || r.mostStatement === null
                ? (r.mostStatement as string | null)
                : null,
            leastStatement:
              typeof r.leastStatement === "string" || r.leastStatement === null
                ? (r.leastStatement as string | null)
                : null,
            likertRating:
              typeof r.likertRating === "number" && Number.isFinite(r.likertRating)
                ? r.likertRating
                : r.likertRating === null
                  ? null
                  : null,
            scoredValue:
              typeof r.scoredValue === "number" && Number.isFinite(r.scoredValue)
                ? r.scoredValue
                : r.scoredValue === null
                  ? null
                  : null,
            isCorrect:
              typeof r.isCorrect === "boolean" || r.isCorrect === null ? (r.isCorrect as boolean | null) : null,
          };
        })
        .filter((x): x is ReportAttemptResponseRow => x !== null)
    : [];

  const tbRaw = o.tenantBranding;
  let tenantBranding: ReportTenantBranding;
  if (tbRaw && typeof tbRaw === "object" && !Array.isArray(tbRaw)) {
    const t = tbRaw as Record<string, unknown>;
    tenantBranding = tenantRowToBranding({
      name: typeof t.name === "string" && t.name.trim() ? t.name.trim() : "Demo Client",
      slug: typeof t.slug === "string" && t.slug.trim() ? t.slug.trim() : "default",
      logoUrl: typeof t.logoUrl === "string" || t.logoUrl === null ? (t.logoUrl as string | null) : null,
      primaryColor:
        typeof t.primaryColor === "string" || t.primaryColor === null ? (t.primaryColor as string | null) : null,
      secondaryColor:
        typeof t.secondaryColor === "string" || t.secondaryColor === null ? (t.secondaryColor as string | null) : null,
      accentColor: typeof t.accentColor === "string" || t.accentColor === null ? (t.accentColor as string | null) : null,
      disclaimerText:
        typeof t.disclaimerText === "string" || t.disclaimerText === null
          ? (t.disclaimerText as string | null)
          : null,
    });
  } else {
    tenantBranding = tenantRowToBranding(null);
  }

  return {
    id: o.id,
    assessmentType,
    reportTemplateType,
    assessmentName: typeof o.assessmentName === "string" ? o.assessmentName : "Assessment",
    completedAt: typeof o.completedAt === "string" ? o.completedAt : new Date(0).toISOString(),
    overallScore: typeof o.overallScore === "number" && Number.isFinite(o.overallScore) ? o.overallScore : 0,
    strengths: Array.isArray(o.strengths) ? o.strengths.filter((s): s is string => typeof s === "string") : [],
    areasOfConcern: Array.isArray(o.areasOfConcern)
      ? o.areasOfConcern.filter((s): s is string => typeof s === "string")
      : [],
    candidateName: typeof o.candidateName === "string" ? o.candidateName : "",
    candidateRole: typeof o.candidateRole === "string" ? o.candidateRole : "",
    tenantName: o.tenantName === null || typeof o.tenantName === "string" ? o.tenantName : null,
    sectionScores,
    groupedQuestionReview,
    traitScores,
    factorAggregates,
    attemptId: typeof o.attemptId === "string" || o.attemptId === null ? o.attemptId : null,
    attemptResponses,
    tenantBranding,
    competencyScores: Array.isArray(o.competencyScores)
      ? o.competencyScores.filter((x): x is import("./report-data").ReportCompetencyScore =>
          !!x && typeof x === "object" && typeof (x as Record<string,unknown>).competencyId === "string"
        )
      : [],
  };
}
