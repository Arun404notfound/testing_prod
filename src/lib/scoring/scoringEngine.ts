import type { ItemType, Polarity } from "@/generated/prisma/enums";
import type { TestBlock } from "@/lib/candidate-test-payload";

export type AnswerMap = Record<string, unknown>;

export type ResponseEvaluation = {
  itemId: string;
  itemType: string;
  selectedAnswer: string | number | Record<string, string>;
  correctAnswer?: string | number | null;
  score: number;
  maxScore: number;
  isCorrect?: boolean | null;
  factor: string;
  attribute: string;
  polarity: Polarity | null;
};

export type TraitScoreRow = {
  factor: string;
  trait: string;
  definition: string;
  score: number;
  maxScore: number;
  percent: number;
};

export type SectionScoreRow = {
  sectionName: string;
  score: number;
  maxScore: number;
  summary: string;
};

export type AttemptResponsePayload = {
  itemId?: string;
  itemOptionId?: string;
  triadGroupId?: string;
  triadMostStatementId?: string;
  triadLeastStatementId?: string;
  status: "ANSWERED";
  numericValue?: number;
  textValue?: string;
  rawScore?: number;
  scoredValue?: number;
  isCorrect?: boolean;
};

export type QuestionResponsePayload = {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
};

export type ScoringItem = {
  id: string;
  itemType: ItemType;
  prompt: string;
  factor: string | null;
  trait: string | null;
  definition: string | null;
  polarity: Polarity | null;
  sectionTitle: string;
  /** Technical/Survey tagging, parallel to factor/trait's Psychometric Attribute tagging. Null for every Psychometric item. */
  skillId: string | null;
  subSkillId: string | null;
  /** Set only for Survey Likert items authored with a custom scale; null for every legacy Psychometric Likert item, which keeps their 1–5 scoring untouched. */
  likertScale: { minValue: number; maxValue: number } | null;
  options: Array<{
    id: string;
    label: string;
    value: string;
    isCorrect: boolean;
    scoreValue: number | null;
  }>;
};

export type ScoringContext = {
  blocks: TestBlock[];
  answers: AnswerMap;
  itemById: Map<string, ScoringItem>;
  questionById: Map<
    string,
    {
      id: string;
      section: string;
      category: string;
      questionText: string;
      option1: string;
      option2: string;
      option3: string;
      option4: string;
      correctOption: number;
      explanation: string;
    }
  >;
  /** Full triad statement metadata keyed by triad group id */
  triadByGroupId: Map<
    string,
    {
      sectionTitle: string;
      statements: Array<{
        id: string;
        statementText: string;
        factor: string;
        trait: string;
        definition: string;
        polarity: Polarity;
      }>;
    }
  >;
};

export type SkillScoreRow = {
  skillId: string;
  subSkillId: string;
  score: number;
  maxScore: number;
};

export type ScoringResult = {
  totalRawScore: number;
  maxScore: number;
  percentage: number;
  sectionScores: SectionScoreRow[];
  traitScores: TraitScoreRow[];
  /** Technical/Survey per-sub-skill raw aggregates. Empty for every Psychometric assessment. */
  skillScores: SkillScoreRow[];
  responseEvaluations: ResponseEvaluation[];
  questionResponses: QuestionResponsePayload[];
  attemptResponses: AttemptResponsePayload[];
  strengths: string[];
  concerns: string[];
};

function optionMarks(opt: { isCorrect: boolean; scoreValue: number | null }): number {
  if (opt.isCorrect) return opt.scoreValue ?? 1;
  return 0;
}

function maxMarksForMcqItem(options: Array<{ isCorrect: boolean; scoreValue: number | null }>): number {
  let m = 1;
  for (const o of options) {
    if (o.isCorrect) m = Math.max(m, o.scoreValue ?? 1);
  }
  return m;
}

/** SJT max isn't gated on isCorrect — every option can carry weighted partial credit, so the best-possible score is simply the highest scoreValue across all options. */
function maxMarksForSjtItem(options: Array<{ scoreValue: number | null }>): number {
  let m = 1;
  for (const o of options) m = Math.max(m, o.scoreValue ?? 0);
  return m;
}

/** Multi-correct MCQ is all-or-nothing — one mark for the whole item, not per-option. */
function maxMarksForMultiItem(): number {
  return 1;
}

/**
 * All-or-nothing: the candidate must select exactly the correct set of options —
 * every correct one, and no incorrect one — to earn the item's single mark. Any
 * partial or over-inclusive selection scores 0, so checking every option is never
 * a viable strategy.
 */
function evaluateMcqMultiSelection(item: ScoringItem, selectedIds: string[]) {
  const max = maxMarksForMultiItem();
  const correctIds = new Set(item.options.filter((o) => o.isCorrect).map((o) => o.id));
  const selectedSet = new Set(selectedIds);
  const isCorrect = selectedSet.size === correctIds.size && [...correctIds].every((id) => selectedSet.has(id));
  const score = isCorrect ? max : 0;
  return { max, score, isCorrect };
}

/** Shared single-best-answer MCQ evaluation, reused by item_mcq/item_tf and by each case-study sub-question. */
function evaluateMcqSelection(item: ScoringItem, optionId: string | undefined) {
  if (optionId === undefined) return null;
  const opt = item.options.find((o) => o.id === optionId);
  if (!opt) return null;
  const max = maxMarksForMcqItem(item.options);
  const score = opt.isCorrect ? optionMarks(opt) : 0;
  const correctOpt = item.options.find((o) => o.isCorrect);
  return { opt, max, score, isCorrect: opt.isCorrect, correctOpt };
}

function likertScoredValue(selectedRating: number, itemPolarity: Polarity | null, min: number, max: number): number {
  if (itemPolarity === "NEGATIVE") return min + max - selectedRating;
  return selectedRating;
}

function triadRoleScore(polarity: Polarity, role: "most" | "neutral" | "least"): number {
  if (polarity === "POSITIVE") {
    if (role === "most") return 3;
    if (role === "neutral") return 2;
    return 1;
  }
  if (role === "most") return 1;
  if (role === "neutral") return 2;
  return 3;
}

function sectionSummary(ratio: number): string {
  if (ratio >= 0.7) return "Strong performance in this section.";
  if (ratio >= 0.5) return "Moderate performance with room to improve.";
  return "Focus on strengthening this section.";
}

function traitKey(factor: string, trait: string): string {
  return `${factor}::${trait}`;
}

export function scoreAssessment(ctx: ScoringContext): ScoringResult {
  const evaluations: ResponseEvaluation[] = [];
  const questionResponses: QuestionResponsePayload[] = [];
  const attemptResponses: AttemptResponsePayload[] = [];

  const sectionAgg = new Map<string, { raw: number; max: number }>();
  const traitAgg = new Map<
    string,
    { factor: string; trait: string; definition: string; raw: number; max: number }
  >();
  const skillAgg = new Map<string, { skillId: string; subSkillId: string; raw: number; max: number }>();

  const bumpSection = (section: string, raw: number, max: number) => {
    const prev = sectionAgg.get(section) ?? { raw: 0, max: 0 };
    prev.raw += raw;
    prev.max += max;
    sectionAgg.set(section, prev);
  };

  const bumpTrait = (factor: string, trait: string, definition: string, raw: number, max: number) => {
    const key = traitKey(factor, trait);
    const prev = traitAgg.get(key) ?? { factor, trait, definition, raw: 0, max: 0 };
    prev.raw += raw;
    prev.max += max;
    traitAgg.set(key, prev);
  };

  // Technical/Survey items tag skillId/subSkillId instead of factor/trait — no-op for
  // every Psychometric item, which never sets these fields.
  const bumpSkill = (skillId: string | null, subSkillId: string | null, raw: number, max: number) => {
    if (!subSkillId || !skillId) return;
    const prev = skillAgg.get(subSkillId) ?? { skillId, subSkillId, raw: 0, max: 0 };
    prev.raw += raw;
    prev.max += max;
    skillAgg.set(subSkillId, prev);
  };

  // ── Pre-pass: register full possible max for EVERY item/block ──────────────
  // This ensures unanswered items still contribute their max to the trait
  // aggregator, so skipped questions correctly reduce the trait percentage.
  for (const b of ctx.blocks) {
    if (b.kind === "legacy_mcq") {
      const q = ctx.questionById.get(b.questionId);
      if (!q) continue;
      bumpTrait(q.section, q.category, q.explanation.slice(0, 120) || q.category, 0, 1);
      bumpSection(q.section, 0, 1);
    } else if (b.kind === "item_mcq" || b.kind === "item_tf") {
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const max = maxMarksForMcqItem(item.options);
      bumpTrait(item.factor ?? "General", item.trait ?? "General", item.definition ?? item.prompt.slice(0, 120), 0, max);
      bumpSection(item.sectionTitle, 0, max);
      bumpSkill(item.skillId, item.subSkillId, 0, max);
    } else if (b.kind === "item_mcq_multi") {
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const max = maxMarksForMultiItem();
      bumpTrait(item.factor ?? "General", item.trait ?? "General", item.definition ?? item.prompt.slice(0, 120), 0, max);
      bumpSection(item.sectionTitle, 0, max);
      bumpSkill(item.skillId, item.subSkillId, 0, max);
    } else if (b.kind === "likert") {
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const scaleMax = (item.likertScale?.maxValue ?? 5) - (item.likertScale?.minValue ?? 1) + 1;
      bumpTrait(item.factor ?? "General", item.trait ?? "General", item.definition ?? item.prompt.slice(0, 120), 0, scaleMax);
      bumpSection(item.sectionTitle, 0, scaleMax);
      bumpSkill(item.skillId, item.subSkillId, 0, scaleMax);
    } else if (b.kind === "triad") {
      const group = ctx.triadByGroupId.get(b.groupId);
      if (!group) continue;
      for (const st of group.statements) {
        bumpTrait(st.factor, st.trait, st.definition, 0, 3);
      }
      bumpSection(group.sectionTitle, 0, 6);
    } else if (b.kind === "sjt") {
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const max = maxMarksForSjtItem(item.options);
      bumpTrait(item.factor ?? "General", item.trait ?? "General", item.definition ?? item.prompt.slice(0, 120), 0, max);
      bumpSection(item.sectionTitle, 0, max);
      bumpSkill(item.skillId, item.subSkillId, 0, max);
    } else if (b.kind === "case_study") {
      let csMax = 0;
      for (const sq of b.subQuestions) {
        const item = ctx.itemById.get(sq.itemId);
        if (!item) continue;
        const max = maxMarksForMcqItem(item.options);
        bumpTrait(item.factor ?? "General", item.trait ?? "General", item.definition ?? item.prompt.slice(0, 120), 0, max);
        csMax += max;
      }
      bumpSection(b.section, 0, csMax);
    }
    // "open_ended" is intentionally excluded from the pre-pass — unscored/qualitative
    // for v1, so it never contributes to totalMax/trait/skill percentages.
  }

  // totalMax comes from the pre-pass (all items); only totalRaw accumulates per answer
  let totalRaw = 0;
  const totalMax = Array.from(sectionAgg.values()).reduce((s, a) => s + a.max, 0);

  for (const b of ctx.blocks) {
    const v = ctx.answers[b.key];
    if (b.kind === "legacy_mcq") {
      const selectedOption = Number(v);
      const q = ctx.questionById.get(b.questionId);
      if (!q) continue;
      if (!Number.isFinite(selectedOption)) continue;
      const isCorrect = selectedOption === q.correctOption;
      const score = isCorrect ? 1 : 0;
      totalRaw += score;
      // Only bump raw — max already registered in pre-pass
      bumpTrait(q.section, q.category, q.explanation.slice(0, 120) || q.category, score, 0);

      evaluations.push({
        itemId: q.id,
        itemType: "LEGACY_MCQ",
        selectedAnswer: selectedOption,
        correctAnswer: q.correctOption,
        score,
        maxScore: 1,
        isCorrect,
        factor: q.section,
        attribute: q.category,
        polarity: null,
      });
      questionResponses.push({ questionId: q.id, selectedOption, isCorrect });
    } else if (b.kind === "item_mcq" || b.kind === "item_tf") {
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const evalResult = evaluateMcqSelection(item, String(v));
      if (!evalResult) continue;
      const { opt, max, score, isCorrect, correctOpt } = evalResult;
      totalRaw += score;
      // Only bump raw — max already registered in pre-pass
      bumpTrait(
        item.factor ?? "General",
        item.trait ?? "General",
        item.definition ?? item.prompt.slice(0, 120),
        score,
        0,
      );
      bumpSkill(item.skillId, item.subSkillId, score, 0);

      evaluations.push({
        itemId: item.id,
        itemType: item.itemType,
        selectedAnswer: opt.label || opt.value,
        correctAnswer: correctOpt ? correctOpt.label || correctOpt.value : null,
        score,
        maxScore: max,
        isCorrect,
        factor: item.factor ?? "General",
        attribute: item.trait ?? "General",
        polarity: item.polarity ?? null,
      });
      attemptResponses.push({
        itemId: item.id,
        itemOptionId: opt.id,
        status: "ANSWERED",
        isCorrect,
        numericValue: isCorrect ? 1 : 0,
        rawScore: score,
        scoredValue: score,
      });
    } else if (b.kind === "item_mcq_multi") {
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const selectedIds = Array.isArray(v) ? v.map(String) : [];
      if (selectedIds.length === 0) continue;
      const { max, score, isCorrect } = evaluateMcqMultiSelection(item, selectedIds);
      totalRaw += score;
      // Only bump raw — max already registered in pre-pass
      bumpTrait(
        item.factor ?? "General",
        item.trait ?? "General",
        item.definition ?? item.prompt.slice(0, 120),
        score,
        0,
      );
      bumpSkill(item.skillId, item.subSkillId, score, 0);

      const selectedLabels = selectedIds
        .map((id) => item.options.find((o) => o.id === id))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        .map((o) => o.label || o.value)
        .join(", ");
      const correctLabels = item.options.filter((o) => o.isCorrect).map((o) => o.label || o.value).join(", ");
      evaluations.push({
        itemId: item.id,
        itemType: item.itemType,
        selectedAnswer: selectedLabels,
        correctAnswer: correctLabels || null,
        score,
        maxScore: max,
        isCorrect,
        factor: item.factor ?? "General",
        attribute: item.trait ?? "General",
        polarity: item.polarity ?? null,
      });
      for (const id of selectedIds) {
        const opt = item.options.find((o) => o.id === id);
        if (!opt) continue;
        attemptResponses.push({
          itemId: item.id,
          itemOptionId: opt.id,
          status: "ANSWERED",
          isCorrect: opt.isCorrect,
          numericValue: opt.isCorrect ? 1 : 0,
          rawScore: opt.isCorrect ? (opt.scoreValue ?? 1) : 0,
          scoredValue: opt.isCorrect ? (opt.scoreValue ?? 1) : 0,
        });
      }
    } else if (b.kind === "open_ended") {
      const text = typeof v === "string" ? v.trim() : "";
      const item = ctx.itemById.get(b.itemId);
      if (!item || !text) continue;
      // Unscored/qualitative for v1 — recorded for human review, excluded from percentage math.
      evaluations.push({
        itemId: item.id,
        itemType: "OPEN_ENDED",
        selectedAnswer: text,
        correctAnswer: null,
        score: 0,
        maxScore: 0,
        isCorrect: null,
        factor: item.factor ?? "General",
        attribute: item.trait ?? "General",
        polarity: null,
      });
      attemptResponses.push({
        itemId: item.id,
        status: "ANSWERED",
        textValue: text,
      });
    } else if (b.kind === "likert") {
      const selectedRating = Number(v);
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const scaleMin = item.likertScale?.minValue ?? 1;
      const scaleMax = item.likertScale?.maxValue ?? 5;
      if (!Number.isFinite(selectedRating) || selectedRating < scaleMin || selectedRating > scaleMax) continue;
      const score = likertScoredValue(selectedRating, item.polarity, scaleMin, scaleMax);
      totalRaw += score;
      // Only bump raw — max already registered in pre-pass
      bumpTrait(
        item.factor ?? "General",
        item.trait ?? "General",
        item.definition ?? item.prompt.slice(0, 120),
        score,
        0,
      );
      bumpSkill(item.skillId, item.subSkillId, score, 0);

      evaluations.push({
        itemId: item.id,
        itemType: "LIKERT",
        selectedAnswer: selectedRating,
        correctAnswer: null,
        score,
        maxScore: scaleMax - scaleMin + 1,
        isCorrect: null,
        factor: item.factor ?? "General",
        attribute: item.trait ?? "General",
        polarity: item.polarity,
      });
      attemptResponses.push({
        itemId: item.id,
        status: "ANSWERED",
        numericValue: selectedRating,
        rawScore: selectedRating,
        scoredValue: score,
      });
    } else if (b.kind === "triad") {
      const t = v as { most?: string; least?: string } | undefined;
      const group = ctx.triadByGroupId.get(b.groupId);
      if (!group) continue;
      if (!t || typeof t !== "object" || !t.most || !t.least || t.most === t.least) continue;
      const mostId = t.most;
      const leastId = t.least;
      let groupRaw = 0;
      const maxPerGroup = 6;

      for (const st of group.statements) {
        let role: "most" | "neutral" | "least";
        if (st.id === mostId) role = "most";
        else if (st.id === leastId) role = "least";
        else role = "neutral";
        const stmtScore = triadRoleScore(st.polarity, role);
        groupRaw += stmtScore;
        bumpTrait(st.factor, st.trait, st.definition, stmtScore, 0); // max pre-registered
        evaluations.push({
          itemId: st.id,
          itemType: "TRIAD",
          selectedAnswer: role,
          correctAnswer: null,
          score: stmtScore,
          maxScore: 3,
          isCorrect: null,
          factor: st.factor,
          attribute: st.trait,
          polarity: st.polarity,
        });
      }
      bumpSection(group.sectionTitle, groupRaw, maxPerGroup);
      totalRaw += groupRaw;

      attemptResponses.push({
        triadGroupId: b.groupId,
        triadMostStatementId: mostId,
        triadLeastStatementId: leastId,
        status: "ANSWERED",
        rawScore: groupRaw,
        scoredValue: groupRaw,
      });
    } else if (b.kind === "sjt") {
      const optionId = String(v);
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const opt = item.options.find((o) => o.id === optionId);
      if (!opt) continue;
      const max = maxMarksForSjtItem(item.options);
      // Weighted partial credit — every option can carry marks, not gated on isCorrect.
      const score = opt.scoreValue ?? 0;
      // "isCorrect" here is a review signal (did they pick the top-scoring option), not the scoring driver.
      const isCorrect = score >= max;
      totalRaw += score;
      // Only bump raw — max already registered in pre-pass
      bumpTrait(
        item.factor ?? "General",
        item.trait ?? "General",
        item.definition ?? item.prompt.slice(0, 120),
        score,
        0,
      );
      bumpSkill(item.skillId, item.subSkillId, score, 0);

      const bestOpt = [...item.options].sort((a, b2) => (b2.scoreValue ?? 0) - (a.scoreValue ?? 0))[0];
      evaluations.push({
        itemId: item.id,
        itemType: "SJT",
        selectedAnswer: opt.label || opt.value,
        correctAnswer: bestOpt ? bestOpt.label || bestOpt.value : null,
        score,
        maxScore: max,
        isCorrect,
        factor: item.factor ?? "General",
        attribute: item.trait ?? "General",
        polarity: item.polarity ?? null,
      });
      attemptResponses.push({
        itemId: item.id,
        itemOptionId: opt.id,
        status: "ANSWERED",
        isCorrect,
        numericValue: score,
        rawScore: score,
        scoredValue: score,
      });
    } else if (b.kind === "case_study") {
      const answerMap = (v as Record<string, string> | undefined) ?? {};
      for (const sq of b.subQuestions) {
        const item = ctx.itemById.get(sq.itemId);
        if (!item) continue;
        const evalResult = evaluateMcqSelection(item, answerMap[sq.itemId]);
        if (!evalResult) continue;
        const { opt, max, score, isCorrect, correctOpt } = evalResult;
        totalRaw += score;
        // Only bump raw — max already registered in pre-pass
        bumpTrait(
          item.factor ?? "General",
          item.trait ?? "General",
          item.definition ?? item.prompt.slice(0, 120),
          score,
          0,
        );

        evaluations.push({
          itemId: item.id,
          itemType: item.itemType,
          selectedAnswer: opt.label || opt.value,
          correctAnswer: correctOpt ? correctOpt.label || correctOpt.value : null,
          score,
          maxScore: max,
          isCorrect,
          factor: item.factor ?? "General",
          attribute: item.trait ?? "General",
          polarity: item.polarity ?? null,
        });
        attemptResponses.push({
          itemId: item.id,
          itemOptionId: opt.id,
          status: "ANSWERED",
          isCorrect,
          numericValue: isCorrect ? 1 : 0,
          rawScore: score,
          scoredValue: score,
        });
      }
    }
  }

  const percentage = totalMax > 0 ? Math.round((totalRaw / totalMax) * 1000) / 10 : 0;

  const sectionScores: SectionScoreRow[] = Array.from(sectionAgg.entries()).map(([sectionName, agg]) => {
    const ratio = agg.max > 0 ? agg.raw / agg.max : 0;
    return {
      sectionName,
      score: agg.raw,
      maxScore: agg.max,
      summary: sectionSummary(ratio),
    };
  });

  const traitScores: TraitScoreRow[] = Array.from(traitAgg.values()).map((row) => ({
    factor: row.factor,
    trait: row.trait,
    definition: row.definition,
    score: row.raw,
    maxScore: row.max,
    percent: row.max > 0 ? Math.round((row.raw / row.max) * 1000) / 10 : 0,
  }));

  const skillScores: SkillScoreRow[] = Array.from(skillAgg.values()).map((row) => ({
    skillId: row.skillId,
    subSkillId: row.subSkillId,
    score: row.raw,
    maxScore: row.max,
  }));

  const strengths = sectionScores
    .filter((s) => s.maxScore > 0 && s.score / s.maxScore >= 0.7)
    .map((s) => `Strength in ${s.sectionName}.`);
  const concerns = sectionScores
    .filter((s) => s.maxScore > 0 && s.score / s.maxScore < 0.45)
    .map((s) => `Opportunity in ${s.sectionName}.`);

  if (sectionScores.length === 0 && totalMax > 0) {
    sectionScores.push({
      sectionName: "Overall",
      score: totalRaw,
      maxScore: totalMax,
      summary: sectionSummary(totalRaw / totalMax),
    });
  }

  return {
    totalRawScore: totalRaw,
    maxScore: totalMax,
    percentage,
    sectionScores,
    traitScores,
    skillScores,
    responseEvaluations: evaluations,
    questionResponses,
    attemptResponses,
    strengths,
    concerns,
  };
}
