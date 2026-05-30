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
  rawScore?: number;
  scoredValue?: number;
  isCorrect?: boolean;
};

export type QuestionResponsePayload = {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
};

export type ScoringContext = {
  blocks: TestBlock[];
  answers: AnswerMap;
  itemById: Map<
    string,
    {
      id: string;
      itemType: ItemType;
      prompt: string;
      factor: string | null;
      trait: string | null;
      definition: string | null;
      polarity: Polarity | null;
      sectionTitle: string;
      options: Array<{
        id: string;
        label: string;
        value: string;
        isCorrect: boolean;
        scoreValue: number | null;
      }>;
    }
  >;
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

export type ScoringResult = {
  totalRawScore: number;
  maxScore: number;
  percentage: number;
  sectionScores: SectionScoreRow[];
  traitScores: TraitScoreRow[];
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

function likertScoredValue(selectedRating: number, itemPolarity: Polarity | null): number {
  if (itemPolarity === "NEGATIVE") return 6 - selectedRating;
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

  let totalRaw = 0;
  let totalMax = 0;

  for (const b of ctx.blocks) {
    const v = ctx.answers[b.key];
    if (b.kind === "legacy_mcq") {
      const selectedOption = Number(v);
      const q = ctx.questionById.get(b.questionId);
      if (!q) continue;
      const isCorrect = selectedOption === q.correctOption;
      const score = isCorrect ? 1 : 0;
      const max = 1;
      totalRaw += score;
      totalMax += max;
      bumpSection(q.section, score, max);
      bumpTrait(q.section, q.category, q.explanation.slice(0, 120) || q.category, score, max);

      evaluations.push({
        itemId: q.id,
        itemType: "LEGACY_MCQ",
        selectedAnswer: selectedOption,
        correctAnswer: q.correctOption,
        score,
        maxScore: max,
        isCorrect,
        factor: q.section,
        attribute: q.category,
        polarity: null,
      });
      questionResponses.push({ questionId: q.id, selectedOption, isCorrect });
    } else if (b.kind === "item_mcq" || b.kind === "item_tf") {
      const optionId = String(v);
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const opt = item.options.find((o) => o.id === optionId);
      if (!opt) continue;
      const max = maxMarksForMcqItem(item.options);
      const score = opt.isCorrect ? optionMarks(opt) : 0;
      const isCorrect = opt.isCorrect;
      totalRaw += score;
      totalMax += max;
      bumpSection(item.sectionTitle, score, max);
      bumpTrait(
        item.factor ?? "General",
        item.trait ?? "General",
        item.definition ?? item.prompt.slice(0, 120),
        score,
        max,
      );

      const correctOpt = item.options.find((o) => o.isCorrect);
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
    } else if (b.kind === "likert") {
      const selectedRating = Number(v);
      const item = ctx.itemById.get(b.itemId);
      if (!item) continue;
      const score = likertScoredValue(selectedRating, item.polarity);
      const max = 5;
      totalRaw += score;
      totalMax += max;
      bumpSection(item.sectionTitle, score, max);
      bumpTrait(
        item.factor ?? "General",
        item.trait ?? "General",
        item.definition ?? item.prompt.slice(0, 120),
        score,
        max,
      );

      evaluations.push({
        itemId: item.id,
        itemType: "LIKERT",
        selectedAnswer: selectedRating,
        correctAnswer: null,
        score,
        maxScore: max,
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
      const t = v as { most: string; least: string };
      const group = ctx.triadByGroupId.get(b.groupId);
      if (!group) continue;
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
        bumpTrait(st.factor, st.trait, st.definition, stmtScore, 3);
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
      totalMax += maxPerGroup;

      attemptResponses.push({
        triadGroupId: b.groupId,
        triadMostStatementId: mostId,
        triadLeastStatementId: leastId,
        status: "ANSWERED",
        rawScore: groupRaw,
        scoredValue: groupRaw,
      });
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
    responseEvaluations: evaluations,
    questionResponses,
    attemptResponses,
    strengths,
    concerns,
  };
}
