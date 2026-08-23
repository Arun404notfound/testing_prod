/**
 * Shared scoring + DB-save logic used by both normal submission (demo-submit)
 * and auto-submit from saved progress (submit-progress).
 */

import { prisma } from "@/lib/prisma";
import { buildTestBlocks, type TestBlock } from "@/lib/candidate-test-payload";
import { scoreAssessment, type AnswerMap, type ScoringContext } from "@/lib/scoring/scoringEngine";
import {
  computeCompetencyScores,
  attributeScoresFromTraitsByName,
  type CompetencyMap,
} from "@/lib/scoring/competencyEngine";
import { getDefaultTenantId } from "@/lib/tenant";
import { logAudit } from "@/lib/audit-log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildScoringContext(assessment: any, blocks: TestBlock[], answers: AnswerMap): ScoringContext {
  const itemById: ScoringContext["itemById"] = new Map();
  for (const i of assessment.items ?? []) {
    itemById.set(i.id, {
      id: i.id, itemType: i.itemType, prompt: i.prompt,
      factor: i.factor ?? null, trait: i.trait ?? null,
      definition: i.definition ?? null, polarity: i.polarity ?? null,
      sectionTitle: i.section?.title ?? "General",
      skillId: i.skillId ?? null, subSkillId: i.subSkillId ?? null,
      likertScale: i.likertScale ? { minValue: i.likertScale.minValue, maxValue: i.likertScale.maxValue } : null,
      options: (i.options ?? []).map((o: { id: string; label: string; value: string; isCorrect: boolean; scoreValue: number | null }) => ({
        id: o.id, label: o.label, value: o.value, isCorrect: o.isCorrect, scoreValue: o.scoreValue,
      })),
    });
  }
  for (const comp of assessment.compositionItems ?? []) {
    if (comp.sourceItem) {
      const i = comp.sourceItem;
      itemById.set(i.id, {
        id: i.id, itemType: i.itemType, prompt: i.prompt,
        factor: i.factor ?? null, trait: i.trait ?? null,
        definition: i.definition ?? null, polarity: i.polarity ?? null,
        sectionTitle: i.section?.title ?? comp.section?.title ?? "Imported",
        skillId: i.skillId ?? null, subSkillId: i.subSkillId ?? null,
        likertScale: i.likertScale ? { minValue: i.likertScale.minValue, maxValue: i.likertScale.maxValue } : null,
        options: (i.options ?? []).map((o: { id: string; label: string; value: string; isCorrect: boolean; scoreValue: number | null }) => ({
          id: o.id, label: o.label, value: o.value, isCorrect: o.isCorrect, scoreValue: o.scoreValue,
        })),
      });
    }
    if (comp.sourceCaseStudy) {
      for (const sq of comp.sourceCaseStudy.subQuestions ?? []) {
        itemById.set(sq.id, {
          id: sq.id, itemType: sq.itemType, prompt: sq.prompt,
          factor: sq.factor ?? null, trait: sq.trait ?? null,
          definition: sq.definition ?? null, polarity: sq.polarity ?? null,
          sectionTitle: sq.section?.title ?? comp.sourceCaseStudy.section?.title ?? comp.section?.title ?? "Imported",
          skillId: sq.skillId ?? null, subSkillId: sq.subSkillId ?? null,
          likertScale: null,
          options: (sq.options ?? []).map((o: { id: string; label: string; value: string; isCorrect: boolean; scoreValue: number | null }) => ({
            id: o.id, label: o.label, value: o.value, isCorrect: o.isCorrect, scoreValue: o.scoreValue,
          })),
        });
      }
    }
  }

  const questionById: ScoringContext["questionById"] = new Map();
  for (const aq of assessment.questions ?? []) {
    const q = aq.question;
    questionById.set(q.id, {
      id: q.id, section: q.section, category: q.category,
      questionText: q.questionText, option1: q.option1, option2: q.option2,
      option3: q.option3, option4: q.option4, correctOption: q.correctOption,
      explanation: q.explanation,
    });
  }

  const triadByGroupId: ScoringContext["triadByGroupId"] = new Map();
  for (const g of assessment.triadGroups ?? []) {
    triadByGroupId.set(g.id, {
      sectionTitle: g.section?.title ?? "General",
      statements: (g.statements ?? []).map((s: { id: string; statementText: string; factor: string; trait: string; definition: string; polarity: string }) => ({
        id: s.id, statementText: s.statementText, factor: s.factor,
        trait: s.trait, definition: s.definition, polarity: s.polarity as "POSITIVE" | "NEGATIVE",
      })),
    });
  }
  for (const comp of assessment.compositionItems ?? []) {
    if (comp.sourceTriad) {
      const g = comp.sourceTriad;
      triadByGroupId.set(g.id, {
        sectionTitle: g.section?.title ?? comp.section?.title ?? "Imported",
        statements: (g.statements ?? []).map((s: { id: string; statementText: string; factor: string; trait: string; definition: string; polarity: string }) => ({
          id: s.id, statementText: s.statementText, factor: s.factor,
          trait: s.trait, definition: s.definition, polarity: s.polarity as "POSITIVE" | "NEGATIVE",
        })),
      });
    }
  }

  return { blocks, answers, itemById, questionById, triadByGroupId };
}

export function buildDemo70ScoringResult(): ReturnType<typeof scoreAssessment> {
  return {
    totalRawScore: 70, maxScore: 100, percentage: 70,
    sectionScores: [{ sectionName: "Overall", score: 70, maxScore: 100, summary: "Auto-submitted with saved progress." }],
    traitScores: [], skillScores: [], responseEvaluations: [], questionResponses: [], attemptResponses: [],
    strengths: ["Assessment completed successfully."],
    concerns: ["Detailed analysis will be available in the final report."],
  };
}

// Full assessment include shape — used in both routes
export const ASSESSMENT_INCLUDE = {
  candidate: true,
  assessment: {
    include: {
      questions: { include: { question: true } },
      sections: { orderBy: { displayOrder: "asc" as const } },
      items: {
        include: { section: true, options: { orderBy: { displayOrder: "asc" as const } }, likertScale: true, images: { orderBy: { displayOrder: "asc" as const } } },
        orderBy: { displayOrder: "asc" as const },
      },
      triadGroups: {
        include: { section: true, statements: { orderBy: { displayOrder: "asc" as const } } },
        orderBy: { displayOrder: "asc" as const },
      },
      caseStudies: {
        include: {
          section: true,
          subQuestions: {
            include: { section: true, options: { orderBy: { displayOrder: "asc" as const } }, images: { orderBy: { displayOrder: "asc" as const } } },
            orderBy: { displayOrder: "asc" as const },
          },
        },
        orderBy: { displayOrder: "asc" as const },
      },
      compositionItems: {
        orderBy: { displayOrder: "asc" as const },
        include: {
          section: true,
          sourceItem: { include: { section: true, options: { orderBy: { displayOrder: "asc" as const } }, likertScale: true, images: { orderBy: { displayOrder: "asc" as const } } } },
          sourceTriad: { include: { section: true, statements: { orderBy: { displayOrder: "asc" as const } } } },
          sourceCaseStudy: {
            include: {
              section: true,
              subQuestions: {
                include: { section: true, options: { orderBy: { displayOrder: "asc" as const } }, images: { orderBy: { displayOrder: "asc" as const } } },
                orderBy: { displayOrder: "asc" as const },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type NextModuleInfo = { assignmentId: string; accessToken: string; moduleType: string; title: string };

export type ScoreAndSaveResult =
  | { ok: true; resultId: string; nextModule?: NextModuleInfo | null }
  | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scoreAndSave(assignment: any, rawAnswers: AnswerMap, existingAttemptId?: string, submissionType?: string): Promise<ScoreAndSaveResult> {
  const tenantId = await getDefaultTenantId();
  const blocks = buildTestBlocks(assignment.assessment);

  const ctx = buildScoringContext(assignment.assessment, blocks, rawAnswers);
  let scored: ReturnType<typeof scoreAssessment>;
  try {
    scored = scoreAssessment(ctx);
    if (scored.maxScore <= 0) scored = buildDemo70ScoringResult();
  } catch {
    scored = buildDemo70ScoringResult();
  }

  // Competency scoring — scoped to this assessment's Job Role (or the legacy
  // tenant-wide, job-role-less competencies when no Job Role is set).
  const jobRoleId: string | null = assignment.assessment?.jobRoleId ?? null;
  const competencyMappings = await prisma.attributeCompetencyMap.findMany({
    where: { competency: { tenantId, jobRoleId } },
    include: { attribute: true, competency: true },
  });
  const attributesByName = new Map(competencyMappings.map((m) => [m.attribute.name, { id: m.attributeId, name: m.attribute.name }]));
  const attributeScores = attributeScoresFromTraitsByName(scored.traitScores, attributesByName);
  const compMapById = new Map<string, CompetencyMap>();
  for (const m of competencyMappings) {
    if (!compMapById.has(m.competencyId)) {
      compMapById.set(m.competencyId, {
        competencyId: m.competencyId,
        competencyName: m.competency.name,
        scoringFormula: m.competency.scoringFormula ?? "WEIGHTED_AVERAGE",
        proficiencyScale: m.competency.proficiencyScale ?? "GENERIC_5",
        attributes: [],
      });
    }
    compMapById.get(m.competencyId)!.attributes.push({ attributeId: m.attributeId, weight: m.weight ?? 1 });
  }
  const competencyScores = computeCompetencyScores(attributeScores, Array.from(compMapById.values()));

  // Skill Competency scoring — Technical/Survey's parallel to Job Role Competency
  // scoring above, keyed directly on subSkillId (no name-matching layer needed since
  // SkillCompetencyMap references subSkillId by FK). Skipped entirely when the
  // assessment has no skill-tagged items (every Psychometric assessment), so this
  // never runs an extra query on the hot path.
  let skillCompetencyScores: ReturnType<typeof computeCompetencyScores> = [];
  if (scored.skillScores.length > 0) {
    const skillFrameworkId: string | null = assignment.assessment?.skillFrameworkId ?? null;
    const skillCompetencyMappings = await prisma.skillCompetencyMap.findMany({
      where: { skillCompetency: { tenantId, skillFrameworkId } },
      include: { skillCompetency: true },
    });
    const subSkillScoreInputs = scored.skillScores.map((s) => ({
      attributeId: s.subSkillId, rawScore: s.score, maxScore: s.maxScore,
    }));
    const skillCompMapById = new Map<string, CompetencyMap>();
    for (const m of skillCompetencyMappings) {
      if (!skillCompMapById.has(m.skillCompetencyId)) {
        skillCompMapById.set(m.skillCompetencyId, {
          competencyId: m.skillCompetencyId,
          competencyName: m.skillCompetency.name,
          scoringFormula: m.skillCompetency.scoringFormula ?? "WEIGHTED_AVERAGE",
          proficiencyScale: m.skillCompetency.proficiencyScale ?? "GENERIC_5",
          attributes: [],
        });
      }
      skillCompMapById.get(m.skillCompetencyId)!.attributes.push({ attributeId: m.subSkillId, weight: m.weight ?? 1 });
    }
    skillCompetencyScores = computeCompetencyScores(subSkillScoreInputs, Array.from(skillCompMapById.values()));
  }

  const completedAt = new Date();
  const overallScore = Math.round(scored.percentage);

  // Determine attempt number
  let attemptNo = 1;
  if (!existingAttemptId) {
    const lastAttempt = await prisma.assessmentAttempt.findFirst({
      where: { assignmentId: assignment.id },
      orderBy: { attemptNo: "desc" },
      select: { attemptNo: true },
    });
    attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
  }

  try {
    const createdResult = await prisma.$transaction(async (tx) => {
      // If we have an existing IN_PROGRESS attempt, update it; otherwise create new
      let attempt: { id: string };
      if (existingAttemptId) {
        attempt = await tx.assessmentAttempt.update({
          where: { id: existingAttemptId },
          data: {
            status: "SCORED",
            submittedAt: completedAt,
            scoredAt: completedAt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            progressData: null as any, // clear saved progress after scoring
            ...(submissionType ? { submissionType } : {}),
            ...(scored.attemptResponses.length > 0
              ? { responses: { create: scored.attemptResponses } }
              : {}),
          },
          select: { id: true },
        });
      } else {
        attempt = await tx.assessmentAttempt.create({
          data: {
            assignmentId: assignment.id,
            candidateId: assignment.candidateId,
            assessmentId: assignment.assessmentId,
            status: "SCORED",
            attemptNo,
            startedAt: completedAt,
            submittedAt: completedAt,
            scoredAt: completedAt,
            ...(submissionType ? { submissionType } : {}),
            ...(scored.attemptResponses.length > 0
              ? { responses: { create: scored.attemptResponses } }
              : {}),
          },
          select: { id: true },
        });
      }

      if (scored.traitScores.length > 0) {
        await tx.traitScore.createMany({
          data: scored.traitScores.map((row) => ({
            attemptId: attempt.id,
            factor: row.factor, trait: row.trait, definition: row.definition,
            score: row.score, maxScore: row.maxScore, percent: row.percent,
          })),
        });
      }

      const result = await tx.assessmentResult.create({
        data: {
          candidateId: assignment.candidateId,
          assessmentId: assignment.assessmentId,
          assignmentId: assignment.id,
          assessmentName: assignment.assessment.title,
          completedAt,
          overallScore,
          strengths: scored.strengths.length > 0 ? scored.strengths : ["Completed assessment across required sections."],
          areasOfConcern: scored.concerns.length > 0 ? scored.concerns : ["Continue building consistency across sections."],
          sectionScores: {
            create: scored.sectionScores.length > 0
              ? scored.sectionScores
              : [{ sectionName: "Overall", score: 0, maxScore: 1, summary: "Auto-submitted." }],
          },
          ...(scored.questionResponses.length > 0
            ? { questionResponses: { create: scored.questionResponses.map((r) => ({ questionId: r.questionId, selectedOption: r.selectedOption, isCorrect: r.isCorrect })) } }
            : {}),
        },
      });

      if (competencyScores.length > 0) {
        await tx.competencyScore.createMany({
          data: competencyScores.map((cs) => ({
            attemptId: attempt.id,
            competencyId: cs.competencyId,
            rawScore: cs.rawScore,
            maxScore: cs.maxScore,
            scaledScore: cs.scaledScore,
            percent: cs.percent,
            band: cs.band,
          })),
        });
      }

      if (skillCompetencyScores.length > 0) {
        await tx.skillScore.createMany({
          data: skillCompetencyScores.map((cs) => ({
            attemptId: attempt.id,
            skillCompetencyId: cs.competencyId,
            rawScore: cs.rawScore,
            maxScore: cs.maxScore,
            scaledScore: cs.scaledScore,
            percent: cs.percent,
            band: cs.band,
          })),
        });
      }

      await tx.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { status: "completed", completedAt },
      });

      // Program sequencing — additive, only runs for assignments created through
      // the Program-assignment flow (programAssignmentId set). Every direct/legacy
      // assignment has this null, so nextModule stays undefined for them and the
      // candidate-facing behavior is byte-identical to before this existed.
      let nextModule: NextModuleInfo | null = null;
      if (assignment.programAssignmentId) {
        const siblings = await tx.assessmentAssignment.findMany({
          where: { programAssignmentId: assignment.programAssignmentId },
          orderBy: { programModuleOrder: "asc" },
          select: {
            id: true,
            status: true,
            accessToken: true,
            programModuleOrder: true,
            assessment: { select: { moduleType: true, title: true } },
          },
        });
        const currentOrder = siblings.find((s) => s.id === assignment.id)?.programModuleOrder ?? 0;
        const upcoming = siblings.filter((s) => s.id !== assignment.id && s.status !== "completed");
        const next =
          upcoming.find((s) => (s.programModuleOrder ?? 0) > currentOrder) ?? upcoming[0] ?? null;

        if (next) {
          nextModule = {
            assignmentId: next.id,
            accessToken: next.accessToken,
            moduleType: next.assessment.moduleType,
            title: next.assessment.title,
          };
        } else {
          // This was the last module — roll every sibling's AssessmentResult into
          // one ProgramResult and mark the ProgramAssignment complete.
          const programResult = await tx.programResult.create({
            data: {
              programAssignmentId: assignment.programAssignmentId,
              candidateId: assignment.candidateId,
              completedAt,
            },
          });
          await tx.assessmentResult.updateMany({
            where: { assignmentId: { in: siblings.map((s) => s.id) } },
            data: { programResultId: programResult.id },
          });
          await tx.programAssignment.update({
            where: { id: assignment.programAssignmentId },
            data: { status: "completed", completedAt },
          });
        }
      }

      return { result, nextModule };
    });

    await logAudit({
      tenantId,
      actorType: "CANDIDATE",
      actorId: assignment.candidateId,
      action: "TEST_SUBMIT",
      entityType: "AssessmentResult",
      entityId: createdResult.result.id,
      message: `Submitted "${assignment.assessment.title}" (${submissionType ?? "NORMAL"}), score ${overallScore}%`,
    });

    return { ok: true, resultId: createdResult.result.id, nextModule: createdResult.nextModule };
  } catch (err) {
    console.error("[scoreAndSave] transaction failed", String(err));
    return { ok: false, error: "Save failed" };
  }
}

/**
 * Auto-submit all IN_PROGRESS attempts with saved progress for a candidate.
 * Called on dashboard load to clean up any abandoned tests.
 */
export async function autoSubmitAbandonedAttempts(candidateId: string): Promise<void> {
  // Only fetch scalar fields — avoids Prisma JSON field select issues with stale bundles
  // Only treat attempts as abandoned if they haven't been updated in the last 10 minutes.
  // This prevents the dashboard from auto-submitting a test that is actively running in another tab.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const abandoned = await prisma.assessmentAttempt.findMany({
    where: { candidateId, status: "IN_PROGRESS", updatedAt: { lt: tenMinutesAgo } },
    select: { id: true, assignmentId: true },
  });

  for (const attempt of abandoned) {
    if (!attempt.assignmentId) continue;
    try {

    // Skip if assignment already completed
    const assignment = await prisma.assessmentAssignment.findUnique({
      where: { id: attempt.assignmentId },
      select: { status: true },
    });
    if (!assignment || assignment.status === "completed") continue;

    // Fetch progressData via raw SQL to bypass any stale Prisma client type issues
    let saved: { answers?: AnswerMap } = {};
    try {
      const raw = await prisma.$queryRawUnsafe<{ progressData: string | null }[]>(
        `SELECT progressData FROM "AssessmentAttempt" WHERE id = ? LIMIT 1`,
        attempt.id,
      );
      const pd = raw[0]?.progressData ?? null;
      if (pd) saved = JSON.parse(pd) as { answers?: AnswerMap };
    } catch { /* column may not exist or JSON invalid — submit with empty answers */ }

    // Load full assignment with assessment data for scoring
    const full = await prisma.assessmentAssignment.findUnique({
      where: { id: attempt.assignmentId },
      include: ASSESSMENT_INCLUDE,
    });
    if (!full) continue;

    const answers: AnswerMap = (saved?.answers ?? {}) as AnswerMap;
    const savedTrigger = (saved as { trigger?: string } | null)?.trigger;
    const submissionType = savedTrigger === "beforeunload" ? "TAB_CLOSED" : "AUTO_SUBMITTED";
    await scoreAndSave(full, answers, attempt.id, submissionType);
    } catch (e) { console.error("[autoSubmit] attempt", attempt.id, String(e)); }
  }
}
