"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { tenantMatchesRow } from "@/lib/tenant-match";
import { getSession } from "@/lib/auth/session";
import { buildTestBlocks, type TestBlock } from "@/lib/candidate-test-payload";
import { scoreAssessment, type AnswerMap, type ScoringContext } from "@/lib/scoring/scoringEngine";
import { computeCompetencyScores, attributeScoresFromTraits } from "@/lib/scoring/competencyEngine";
import { computeProctoringTrustScore, countProctoringEvents } from "@/lib/proctoring-trust";

function testAccessBlocked(
  assessment: {
    lifecycleStatus: string;
    startDateTime: Date | null;
    endDateTime: Date | null;
    maxAttempts: number;
  },
  scoredAttempts: number,
): string | null {
  if (assessment.lifecycleStatus !== "published") return "unpublished";
  const now = new Date();
  if (assessment.startDateTime && now < assessment.startDateTime) return "not_started";
  if (assessment.endDateTime && now > assessment.endDateTime) return "ended";
  if (scoredAttempts >= assessment.maxAttempts) return "max_attempts";
  return null;
}

function parsePayload(raw: string): AnswerMap | null {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as AnswerMap) : null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDemoAnswers(blocks: TestBlock[], answers: AnswerMap, assessment: any): AnswerMap {
  // TODO: remove demo normalization — restore strict validateAnswers after demo.
  const out: AnswerMap = { ...answers };
  for (const b of blocks) {
    const v = out[b.key];
    if (b.kind === "legacy_mcq") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1 || n > 4) {
        const aq = assessment.questions?.find((q: { questionId: string }) => q.questionId === b.questionId);
        const correct = Number(aq?.question?.correctOption ?? 1);
        out[b.key] = correct === 1 ? 2 : 1;
      }
    } else if (b.kind === "item_mcq" || b.kind === "item_tf") {
      const ok = typeof v === "string" && v.length > 0 && b.options.some((o) => o.optionId === v);
      if (!ok) {
        const item = assessment.items?.find((i: { id: string }) => i.id === b.itemId);
        const wrongOpt = item?.options?.find((o: { isCorrect: boolean }) => !o.isCorrect);
        const firstOpt = item?.options?.[0];
        out[b.key] = (wrongOpt ?? firstOpt)?.id ?? b.options[0]?.optionId ?? "";
      }
    } else if (b.kind === "likert") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        out[b.key] = 3;
      }
    } else if (b.kind === "triad") {
      let t = v as { most?: string; least?: string } | undefined;
      if (!t || typeof t !== "object") t = {};
      const ids = b.statements.map((s) => s.id);
      const first = ids[0] ?? "";
      const second = ids.find((id) => id !== first) ?? first;
      if (
        !t.most ||
        !t.least ||
        !ids.includes(t.most) ||
        !ids.includes(t.least) ||
        t.most === t.least
      ) {
        out[b.key] = { most: first, least: second };
      }
    }
  }
  return out;
}

function buildDemoFallbackScoringResult(): ReturnType<typeof scoreAssessment> {
  // TODO: remove demo fallback scoring — restore strict scoreAssessment-only path after demo.
  return {
    totalRawScore: 0,
    maxScore: 1,
    percentage: 0,
    sectionScores: [
      {
        sectionName: "Overall",
        score: 0,
        maxScore: 1,
        summary: "Demo summary — scoring used a safe fallback.",
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

export async function submitCandidateTest(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const payloadRaw = String(formData.get("payload") ?? "");
  const attemptIdRaw = String(formData.get("attemptId") ?? "").trim();
  if (!assignmentId) notFound();

  const session = await getSession();
  if (!session || session.role !== "CANDIDATE" || !session.candidateId) {
    redirect("/login");
  }

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
    assignment.status === "completed" ||
    assignment.candidateId !== session.candidateId ||
    !tenantMatchesRow(assignment.candidate.tenantId, tenantId)
  ) {
    redirect("/candidate");
  }

  const scoredAttempts = await prisma.assessmentAttempt.count({
    where: {
      assignmentId: assignment.id,
      status: { in: ["SCORED", "SUBMITTED"] },
    },
  });
  if (testAccessBlocked(assignment.assessment, scoredAttempts)) {
    redirect("/candidate");
  }

  const blocks = buildTestBlocks(assignment.assessment);
  if (blocks.length === 0) {
    redirect("/candidate");
  }

  let answers: AnswerMap = parsePayload(payloadRaw) ?? {};
  // TODO: demo — allow empty/malformed JSON payload; normalize instead of redirecting.
  answers = normalizeDemoAnswers(blocks, answers, assignment.assessment);

  console.log("[submitCandidateTest] start", {
    assignmentId,
    attemptId: attemptIdRaw,
    parsedAnswersCount: Object.keys(answers).length,
    blockCount: blocks.length,
    candidateId: assignment.candidateId,
    assessmentId: assignment.assessmentId,
  });

  const ctx = buildScoringContext(assignment.assessment, blocks, answers);
  let scored: ReturnType<typeof scoreAssessment>;
  try {
    scored = scoreAssessment(ctx);
    if (scored.maxScore <= 0) {
      // TODO: demo — maxScore 0 would block persistence; use fallback result.
      console.warn("[submitCandidateTest] maxScore <= 0, using demo fallback scoring", {
        assignmentId,
        maxScore: scored.maxScore,
      });
      scored = buildDemoFallbackScoringResult();
    }
  } catch (err) {
    // TODO: demo — scoringEngine threw; use fallback so a report is still created.
    console.error("[submitCandidateTest] scoreAssessment failed, using demo fallback", {
      assignmentId,
      err: String(err),
    });
    scored = buildDemoFallbackScoringResult();
  }

  const completedAt = new Date();
  const overallScore = Math.round(scored.percentage);

  const lastAttempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId: assignment.id },
    orderBy: { attemptNo: "desc" },
    select: { attemptNo: true },
  });
  const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;

  let resultId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      let attemptIdForTraits: string;

      const byId =
        attemptIdRaw.length > 0
          ? await tx.assessmentAttempt.findFirst({
              where: {
                id: attemptIdRaw,
                assignmentId: assignment.id,
                status: "IN_PROGRESS",
              },
              include: { proctoringEvents: { select: { type: true } } },
            })
          : null;

      const inProgressAny =
        byId ??
        (await tx.assessmentAttempt.findFirst({
          where: { assignmentId: assignment.id, status: "IN_PROGRESS" },
          orderBy: { createdAt: "desc" },
          include: { proctoringEvents: { select: { type: true } } },
        }));

      if (inProgressAny) {
        const { tabSwitchCount, fullscreenExitCount } = countProctoringEvents(inProgressAny.proctoringEvents);
        const { trustScore } = computeProctoringTrustScore({
          cameraGranted: inProgressAny.proctoringCameraGranted,
          tabSwitchCount,
          fullscreenExitCount,
        });

        await tx.attemptResponse.deleteMany({ where: { attemptId: inProgressAny.id } });

        await tx.assessmentAttempt.update({
          where: { id: inProgressAny.id },
          data: {
            status: "SCORED",
            submittedAt: completedAt,
            scoredAt: completedAt,
            trustScore,
            responses: { create: scored.attemptResponses },
          },
        });
        attemptIdForTraits = inProgressAny.id;
      } else {
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
            responses: { create: scored.attemptResponses },
          },
          select: { id: true },
        });
        attemptIdForTraits = attempt.id;
      }

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

      // ── Competency scoring ───────────────────────────────────────────────
      // Load attribute + competency maps for this tenant, then compute scores.
      try {
        const tenantIdForComp = assignment.assessment.tenantId ?? null;
        const [dbAttributes, competencyMaps] = await Promise.all([
          tx.attribute.findMany({
            where: tenantIdForComp ? { tenantId: tenantIdForComp } : {},
            select: { id: true, code: true, name: true },
          }),
          tx.attributeCompetencyMap.findMany({
            where: tenantIdForComp
              ? { attribute: { tenantId: tenantIdForComp } }
              : {},
            include: { competency: { select: { id: true, name: true, reportDescription: true, scoringFormula: true } } },
          }),
        ]);

        if (dbAttributes.length > 0 && competencyMaps.length > 0) {
          const attributesByCode = new Map(dbAttributes.map((a) => [a.code, { id: a.id }]));

          // Build attribute scores from trait scores (factor field = attribute code)
          const attrScores = attributeScoresFromTraits(scored.traitScores, attributesByCode);

          // Group maps by competency
          const compMapsByCompetency = new Map<string, { id: string; name: string; scoringFormula: string; attrs: Array<{ attributeId: string; weight: number }> }>();
          for (const m of competencyMaps) {
            const existing = compMapsByCompetency.get(m.competencyId) ?? {
              id: m.competency.id,
              name: m.competency.name,
              scoringFormula: m.competency.scoringFormula ?? "WEIGHTED_AVERAGE",
              attrs: [],
            };
            existing.attrs.push({ attributeId: m.attributeId, weight: m.weight });
            compMapsByCompetency.set(m.competencyId, existing);
          }

          const competencyInputs = Array.from(compMapsByCompetency.values()).map((c) => ({
            competencyId: c.id,
            competencyName: c.name,
            scoringFormula: c.scoringFormula,
            attributes: c.attrs,
          }));

          const competencyScores = computeCompetencyScores(attrScores, competencyInputs);

          if (competencyScores.length > 0) {
            await tx.competencyScore.createMany({
              data: competencyScores.map((cs) => ({
                attemptId: attemptIdForTraits,
                competencyId: cs.competencyId,
                rawScore: cs.rawScore,
                maxScore: cs.maxScore,
                scaledScore: cs.scaledScore,
                percent: cs.percent,
                band: cs.band,
              })),
            });
          }
        }
      } catch (compErr) {
        // Competency scoring is non-critical — do not fail the whole submission
        console.warn("Competency scoring failed (non-fatal):", compErr);
      }
      // ── End competency scoring ───────────────────────────────────────────

      const createdResult = await tx.assessmentResult.create({
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
            create: scored.sectionScores,
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

      await tx.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { status: "completed", completedAt },
      });

      return createdResult;
    });
    resultId = result.id;
  } catch (txErr) {
    console.error("[submitCandidateTest] transaction failed", { assignmentId, err: String(txErr) });
    redirect("/candidate");
  }

  console.log("[submitCandidateTest] success", {
    assignmentId,
    attemptId: attemptIdRaw,
    resultId,
    overallScore,
    redirectTarget: `/candidate/reports/${resultId}`,
  });

  revalidatePath("/candidate");
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/reports");
  redirect(`/candidate/reports/${resultId}`);
}
