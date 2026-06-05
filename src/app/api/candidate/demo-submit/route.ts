import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { tenantMatchesRow } from "@/lib/tenant-match";
import { getSession } from "@/lib/auth/session";
import { buildTestBlocks, type TestBlock } from "@/lib/candidate-test-payload";
import { scoreAssessment, type AnswerMap, type ScoringContext } from "@/lib/scoring/scoringEngine";
import {
  computeCompetencyScores,
  attributeScoresFromTraitsByName,
  type CompetencyMap,
} from "@/lib/scoring/competencyEngine";

// --- Demo-only: duplicated from candidate test actions (keep in sync when restoring prod submit). ---


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildScoringContext(assessment: any, blocks: TestBlock[], answers: AnswerMap): ScoringContext {
  const itemById: ScoringContext["itemById"] = new Map();
  for (const i of assessment.items ?? []) {
    itemById.set(i.id, {
      id: i.id,
      itemType: i.itemType,
      prompt: i.prompt,
      factor: i.factor ?? null,
      trait: i.trait ?? null,
      definition: i.definition ?? null,
      polarity: i.polarity ?? null,
      sectionTitle: i.section?.title ?? "General",
      options: (i.options ?? []).map(
        (o: { id: string; label: string; value: string; isCorrect: boolean; scoreValue: number | null }) => ({
          id: o.id,
          label: o.label,
          value: o.value,
          isCorrect: o.isCorrect,
          scoreValue: o.scoreValue,
        }),
      ),
    });
  }
  for (const comp of assessment.compositionItems ?? []) {
    if (comp.sourceItem) {
      const i = comp.sourceItem;
      itemById.set(i.id, {
        id: i.id,
        itemType: i.itemType,
        prompt: i.prompt,
        factor: i.factor ?? null,
        trait: i.trait ?? null,
        definition: i.definition ?? null,
        polarity: i.polarity ?? null,
        sectionTitle: i.section?.title ?? comp.section?.title ?? "Imported",
        options: (i.options ?? []).map(
          (o: { id: string; label: string; value: string; isCorrect: boolean; scoreValue: number | null }) => ({
            id: o.id,
            label: o.label,
            value: o.value,
            isCorrect: o.isCorrect,
            scoreValue: o.scoreValue,
          }),
        ),
      });
    }
  }

  const questionById: ScoringContext["questionById"] = new Map();
  for (const aq of assessment.questions ?? []) {
    const q = aq.question;
    questionById.set(q.id, {
      id: q.id,
      section: q.section,
      category: q.category,
      questionText: q.questionText,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correctOption: q.correctOption,
      explanation: q.explanation,
    });
  }

  const triadByGroupId: ScoringContext["triadByGroupId"] = new Map();
  for (const g of assessment.triadGroups ?? []) {
    triadByGroupId.set(g.id, {
      sectionTitle: g.section?.title ?? "General",
      statements: (g.statements ?? []).map(
        (s: {
          id: string;
          statementText: string;
          factor: string;
          trait: string;
          definition: string;
          polarity: string;
        }) => ({
          id: s.id,
          statementText: s.statementText,
          factor: s.factor,
          trait: s.trait,
          definition: s.definition,
          polarity: s.polarity as "POSITIVE" | "NEGATIVE",
        }),
      ),
    });
  }
  for (const comp of assessment.compositionItems ?? []) {
    if (comp.sourceTriad) {
      const g = comp.sourceTriad;
      triadByGroupId.set(g.id, {
        sectionTitle: g.section?.title ?? comp.section?.title ?? "Imported",
        statements: (g.statements ?? []).map(
          (s: {
            id: string;
            statementText: string;
            factor: string;
            trait: string;
            definition: string;
            polarity: string;
          }) => ({
            id: s.id,
            statementText: s.statementText,
            factor: s.factor,
            trait: s.trait,
            definition: s.definition,
            polarity: s.polarity as "POSITIVE" | "NEGATIVE",
          }),
        ),
      });
    }
  }

  return { blocks, answers, itemById, questionById, triadByGroupId };
}

function buildDemo70ScoringResult(): ReturnType<typeof scoreAssessment> {
  // TODO: demo — scoringEngine fallback fixed score 70.
  return {
    totalRawScore: 70,
    maxScore: 100,
    percentage: 70,
    sectionScores: [
      {
        sectionName: "Overall",
        score: 70,
        maxScore: 100,
        summary: "Demo scoring fallback applied.",
      },
    ],
    traitScores: [],
    responseEvaluations: [],
    questionResponses: [],
    attemptResponses: [],
    strengths: ["Assessment completed successfully."],
    concerns: ["Detailed analysis will be available in the final report."],
  };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE" || !session.candidateId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { assignmentId?: string; answers?: unknown; submissionType?: string };
  const assignmentId = String(b.assignmentId ?? "").trim();
  const submissionType = typeof b.submissionType === "string" ? b.submissionType : "NORMAL";
  if (!assignmentId) {
    return NextResponse.json({ ok: false, error: "Missing assignmentId" }, { status: 400 });
  }

  const rawAnswers: AnswerMap =
    b.answers && typeof b.answers === "object" && !Array.isArray(b.answers) ? (b.answers as AnswerMap) : {};

  const tenantId = await getDefaultTenantId();
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      candidate: true,
      assessment: {
        include: {
          questions: { include: { question: true } },
          sections: { orderBy: { displayOrder: "asc" } },
          items: {
            include: {
              section: true,
              options: { orderBy: { displayOrder: "asc" } },
              likertScale: true,
            },
            orderBy: { displayOrder: "asc" },
          },
          triadGroups: {
            include: {
              section: true,
              statements: { orderBy: { displayOrder: "asc" } },
            },
            orderBy: { displayOrder: "asc" },
          },
          compositionItems: {
            orderBy: { displayOrder: "asc" },
            include: {
              section: true,
              sourceItem: {
                include: {
                  section: true,
                  options: { orderBy: { displayOrder: "asc" } },
                  likertScale: true,
                },
              },
              sourceTriad: {
                include: {
                  section: true,
                  statements: { orderBy: { displayOrder: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !assignment ||
    assignment.candidateId !== session.candidateId ||
    !tenantMatchesRow(assignment.candidate.tenantId, tenantId)
  ) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (assignment.status === "completed") {
    return NextResponse.json({ ok: false, error: "Assignment already completed" }, { status: 400 });
  }

  const blocks = buildTestBlocks(assignment.assessment);
  if (blocks.length === 0) {
    return NextResponse.json({ ok: false, error: "No takeable items" }, { status: 400 });
  }

  const ctx = buildScoringContext(assignment.assessment, blocks, rawAnswers);
  let scored: ReturnType<typeof scoreAssessment>;
  try {
    scored = scoreAssessment(ctx);
    if (scored.maxScore <= 0) {
      // Fallback to demo score but keep real attempt responses so submissions view works
      scored = { ...buildDemo70ScoringResult(), attemptResponses: scored.attemptResponses, traitScores: scored.traitScores };
    }
  } catch {
    // scoringEngine threw — use demo scores; attempt responses will be empty
    scored = buildDemo70ScoringResult();
  }

  // ── Competency scoring (Big Five formula) ───────────────────────────────────
  // Load attribute→competency mappings for this tenant
  const competencyMappings = await prisma.attributeCompetencyMap.findMany({
    where: { competency: { tenantId } },
    include: { attribute: true, competency: true },
  });

  // Build lookup: attribute name → { id, name }
  const attributesByName = new Map(
    competencyMappings.map((m) => [m.attribute.name, { id: m.attributeId, name: m.attribute.name }]),
  );

  // Bridge trait scores (keyed by trait=attributeName) → attribute scores
  const attributeScores = attributeScoresFromTraitsByName(scored.traitScores, attributesByName);

  // Group mappings per competency — use DB weight and scoringFormula
  const compMapById = new Map<string, CompetencyMap>();
  for (const m of competencyMappings) {
    if (!compMapById.has(m.competencyId)) {
      compMapById.set(m.competencyId, {
        competencyId: m.competencyId,
        competencyName: m.competency.name,
        scoringFormula: m.competency.scoringFormula ?? "WEIGHTED_AVERAGE",
        attributes: [],
      });
    }
    compMapById.get(m.competencyId)!.attributes.push({
      attributeId: m.attributeId,
      weight: m.weight ?? 1,
    });
  }

  // Use Big Five scaling when the assessment has Likert or Forced-Choice items
  const competencyScores = computeCompetencyScores(
    attributeScores,
    Array.from(compMapById.values()),
  );

  const completedAt = new Date();
  const overallScore = Math.round(scored.percentage);

  const lastAttempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId: assignment.id },
    orderBy: { attemptNo: "desc" },
    select: { attemptNo: true },
  });
  const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;

  try {
    const createdResult = await prisma.$transaction(async (tx) => {
      const attempt = await tx.assessmentAttempt.create({
        data: {
          assignmentId: assignment.id,
          candidateId: assignment.candidateId,
          assessmentId: assignment.assessmentId,
          status: "SCORED",
          attemptNo,
          startedAt: completedAt,
          submittedAt: completedAt,
          scoredAt: completedAt,
          submissionType,
          ...(scored.attemptResponses.length > 0
            ? { responses: { create: scored.attemptResponses } }
            : {}),
        },
        select: { id: true },
      });
      const attemptIdForTraits = attempt.id;

      if (scored.traitScores.length > 0) {
        await tx.traitScore.createMany({
          data: scored.traitScores.map((row) => ({
            attemptId: attemptIdForTraits,
            factor: row.factor,
            trait: row.trait,
            definition: row.definition,
            score: row.score,
            maxScore: row.maxScore,
            percent: row.percent,
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
          strengths:
            scored.strengths.length > 0 ? scored.strengths : ["Completed assessment across required sections."],
          areasOfConcern:
            scored.concerns.length > 0 ? scored.concerns : ["Continue building consistency across sections."],
          sectionScores: {
            // TODO: demo — ensure at least one SectionScore row if engine returns none.
            create:
              scored.sectionScores.length > 0
                ? scored.sectionScores
                : [
                    {
                      sectionName: "Overall",
                      score: 0,
                      maxScore: 1,
                      summary: "Demo placeholder section score.",
                    },
                  ],
          },
          ...(scored.questionResponses.length > 0
            ? {
                questionResponses: {
                  create: scored.questionResponses.map((r) => ({
                    questionId: r.questionId,
                    selectedOption: r.selectedOption,
                    isCorrect: r.isCorrect,
                  })),
                },
              }
            : {}),
        },
      });

      // Save competency scores
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

      await tx.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { status: "completed", completedAt },
      });

      return result;
    });

    console.log("[demo-submit] ok", {
      assignmentId,
      resultId: createdResult.id,
      candidateId: session.candidateId,
      overallScore,
    });

    revalidatePath("/candidate");
    revalidatePath("/admin/assignments");
    revalidatePath("/admin/reports");
    return NextResponse.json({ ok: true, resultId: createdResult.id });
  } catch (err) {
    console.error("[demo-submit] transaction failed", String(err));
    return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 });
  }
}
