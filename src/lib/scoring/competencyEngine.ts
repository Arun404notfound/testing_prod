/**
 * Competency Engine
 *
 * Maps TraitScores → Attributes → Competencies using DB-configured
 * weights and scoring formula per competency.
 *
 * Supported scoringFormula values (stored on the Competency row):
 *   "WEIGHTED_AVERAGE"  — default; uses per-attribute weight from AttributeCompetencyMap
 *   "SIMPLE_AVERAGE"    — ignores weights; all attributes treated equally
 *
 * Big Five scoring formula (from AssessmentDesign & Scoring sheet):
 *   Per attribute: 1 Likert item (1–5) + Forced-choice appearances (min 3, max 9)
 *   Raw range: [4, 14]
 *   Scaled score = 1 + (rawScore − 4) × (9 / 10)  →  maps [4, 14] → [1, 10]
 */

// ── Constants ─────────────────────────────────────────────────────────────────
/** Min possible raw score per attribute (1 Likert + FC floor) */
export const BIG_FIVE_MIN = 4;
/** Max possible raw score per attribute (5 Likert + FC ceiling) */
export const BIG_FIVE_MAX = 14;

// ── Scoring formula identifiers ───────────────────────────────────────────────
export const SCORING_FORMULAS = {
  WEIGHTED_AVERAGE: "WEIGHTED_AVERAGE",
  SIMPLE_AVERAGE: "SIMPLE_AVERAGE",
  HIGHEST_ATTRIBUTE: "HIGHEST_ATTRIBUTE",
  LOWEST_ATTRIBUTE: "LOWEST_ATTRIBUTE",
  GEOMETRIC_MEAN: "GEOMETRIC_MEAN",
} as const;

export type ScoringFormula = (typeof SCORING_FORMULAS)[keyof typeof SCORING_FORMULAS];

export const SCORING_FORMULA_LABELS: Record<string, string> = {
  WEIGHTED_AVERAGE: "Weighted Average",
  SIMPLE_AVERAGE: "Simple Average",
  HIGHEST_ATTRIBUTE: "Highest Attribute (Peak)",
  LOWEST_ATTRIBUTE: "Lowest Attribute (Weakest Link)",
  GEOMETRIC_MEAN: "Geometric Mean (Balanced)",
};

export const SCORING_FORMULA_DESCRIPTIONS: Record<string, { summary: string; formula: string; useCase: string }> = {
  WEIGHTED_AVERAGE: {
    summary: "Each attribute contributes proportionally to its assigned weight. Higher weight = more influence on the final score.",
    formula: "Score = Σ(attribute_score × weight) ÷ Σ(weights)",
    useCase: "Best for: Competencies where some attributes matter more than others. E.g., 'Leadership' where Assertiveness (w=2) is more critical than Modesty (w=1).",
  },
  SIMPLE_AVERAGE: {
    summary: "All attributes are treated equally regardless of any weight set. The final score is the plain mean.",
    formula: "Score = Σ(attribute_scores) ÷ n",
    useCase: "Best for: Balanced competencies where all traits contribute equally. E.g., 'Teamwork' where Trust, Empathy and Communication are equally important.",
  },
  HIGHEST_ATTRIBUTE: {
    summary: "The competency score equals the single highest attribute score. One outstanding trait lifts the whole competency.",
    formula: "Score = max(attribute_scores)",
    useCase: "Best for: Creative or sales roles where a natural peak strength defines the competency. E.g., 'Innovation' where exceptional Openness alone is sufficient.",
  },
  LOWEST_ATTRIBUTE: {
    summary: "The competency score equals the single lowest attribute score. All attributes must be strong — the weakest one is the bottleneck.",
    formula: "Score = min(attribute_scores)",
    useCase: "Best for: Safety-critical or compliance roles where every attribute must meet a threshold. E.g., 'Integrity' where any low score on honesty is disqualifying.",
  },
  GEOMETRIC_MEAN: {
    summary: "The nth root of the product of all attribute scores. Penalizes extreme lows more than a simple average — a very low score cannot be offset by other highs.",
    formula: "Score = (Π attribute_scores)^(1/n)",
    useCase: "Best for: Big Five personality competencies. Ensures balanced development across all traits without one strong attribute masking a weakness.",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttributeScoreInput = {
  attributeId: string;
  attributeName?: string;
  rawScore: number;
  maxScore: number;
};

export type CompetencyMap = {
  competencyId: string;
  competencyName: string;
  /** Formula to combine attribute scores. Default: "WEIGHTED_AVERAGE" */
  scoringFormula: string;
  attributes: Array<{
    attributeId: string;
    weight: number;
  }>;
};

export type CompetencyScoreOutput = {
  competencyId: string;
  competencyName: string;
  rawScore: number;
  maxScore: number;
  /** Normalized to 1–10 scale */
  scaledScore: number;
  percent: number;
  band: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function scoreBand(scaledScore: number): string {
  if (scaledScore >= 8.5) return "Exceptional";
  if (scaledScore >= 7) return "Strong";
  if (scaledScore >= 5) return "Moderate";
  if (scaledScore >= 3) return "Developing";
  return "Low";
}

/**
 * Apply the Big Five linear conversion.
 * Formula: New Score = 1 + (raw − min) × 9 / (max − min)
 * Maps [BIG_FIVE_MIN, BIG_FIVE_MAX] → [1, 10]
 */
export function bigFiveScale(
  raw: number,
  min = BIG_FIVE_MIN,
  max = BIG_FIVE_MAX,
): number {
  const range = max - min;
  if (range <= 0) return 1;
  const scaled = 1 + ((raw - min) / range) * 9;
  return Math.round(Math.max(1, Math.min(10, scaled)) * 10) / 10;
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Compute competency scores from attribute scores.
 *
 * Per-attribute score  = (rawScore / maxScore) × 10   →  0–10 scale
 * Competency score     = Σ(attrScore × weight) / Σ(weights)  (weighted average, DB weights)
 * Percent              = (scaledScore / 10) × 100
 */
export function computeCompetencyScores(
  attributeScores: AttributeScoreInput[],
  competencyMaps: CompetencyMap[],
): CompetencyScoreOutput[] {
  const attrMap = new Map<string, AttributeScoreInput>();
  for (const a of attributeScores) {
    attrMap.set(a.attributeId, a);
  }

  const results: CompetencyScoreOutput[] = [];

  for (const comp of competencyMaps) {
    // ── Step 1: convert each attribute to a 0–10 score ──────────────────────
    type WeightedAttr = { score: number; weight: number; raw: number; max: number };
    const attrs: WeightedAttr[] = [];

    for (const mapping of comp.attributes) {
      const attr = attrMap.get(mapping.attributeId);
      // Missing or zero-max attributes count as 0 score but still contribute
      // their weight to the denominator — otherwise a partially-answered
      // assessment inflates scores by excluding unanswered attributes.
      const score = attr && attr.maxScore > 0
        ? Math.min(10, (attr.rawScore / attr.maxScore) * 10)
        : 0;
      attrs.push({ score, weight: mapping.weight, raw: attr?.rawScore ?? 0, max: attr?.maxScore ?? 0 });
    }

    if (attrs.length === 0) continue;

    // ── Step 2: apply scoring formula ────────────────────────────────────────
    let rawScaled: number;
    const formula = comp.scoringFormula ?? SCORING_FORMULAS.WEIGHTED_AVERAGE;

    if (formula === SCORING_FORMULAS.SIMPLE_AVERAGE) {
      rawScaled = attrs.reduce((s, a) => s + a.score, 0) / attrs.length;
    } else if (formula === SCORING_FORMULAS.HIGHEST_ATTRIBUTE) {
      rawScaled = Math.max(...attrs.map((a) => a.score));
    } else if (formula === SCORING_FORMULAS.LOWEST_ATTRIBUTE) {
      rawScaled = Math.min(...attrs.map((a) => a.score));
    } else if (formula === SCORING_FORMULAS.GEOMETRIC_MEAN) {
      const product = attrs.reduce((p, a) => p * Math.max(0.001, a.score), 1);
      rawScaled = Math.pow(product, 1 / attrs.length);
    } else {
      // WEIGHTED_AVERAGE (default)
      const totalWeight = attrs.reduce((s, a) => s + a.weight, 0);
      rawScaled = totalWeight > 0
        ? attrs.reduce((s, a) => s + a.score * a.weight, 0) / totalWeight
        : attrs.reduce((s, a) => s + a.score, 0) / attrs.length;
    }

    const scaledScore = Math.round(Math.min(10, Math.max(0, rawScaled)) * 10) / 10;

    // ── Step 3: percent on 0–100 scale ───────────────────────────────────────
    const percent = Math.round((scaledScore / 10) * 1000) / 10;

    const totalRaw = attrs.reduce((s, a) => s + a.raw, 0);
    const totalMax = attrs.reduce((s, a) => s + a.max, 0);

    results.push({
      competencyId: comp.competencyId,
      competencyName: comp.competencyName,
      rawScore: totalRaw,
      maxScore: totalMax,
      scaledScore,
      percent,
      band: scoreBand(scaledScore),
    });
  }

  return results;
}

/**
 * Build attribute scores from trait scores where `factor` matches an
 * attribute code. Used when questions have factor=attributeCode in the DB.
 */
export function attributeScoresFromTraits(
  traitScores: Array<{ factor: string; score: number; maxScore: number }>,
  attributesByCode: Map<string, { id: string; name?: string }>,
): AttributeScoreInput[] {
  const agg = new Map<string, { rawScore: number; maxScore: number; name?: string }>();

  for (const t of traitScores) {
    const attr = attributesByCode.get(t.factor);
    if (!attr) continue;
    const prev = agg.get(attr.id) ?? {
      rawScore: 0,
      maxScore: 0,
      name: (attr as { id: string; name?: string }).name,
    };
    prev.rawScore += t.score;
    prev.maxScore += t.maxScore;
    agg.set(attr.id, prev);
  }

  return Array.from(agg.entries()).map(([attributeId, scores]) => ({
    attributeId,
    attributeName: scores.name,
    rawScore: scores.rawScore,
    maxScore: scores.maxScore,
  }));
}

/**
 * Build attribute scores from trait scores where `trait` matches an
 * attribute name. Used for Big Five assessments where Likert/Triad items
 * store the attribute name in the `trait` field.
 */
export function attributeScoresFromTraitsByName(
  traitScores: Array<{ trait: string; score: number; maxScore: number }>,
  attributesByName: Map<string, { id: string; name: string }>,
): AttributeScoreInput[] {
  const agg = new Map<string, { rawScore: number; maxScore: number; name: string }>();

  for (const t of traitScores) {
    const attr = attributesByName.get(t.trait);
    if (!attr) continue;
    const prev = agg.get(attr.id) ?? { rawScore: 0, maxScore: 0, name: attr.name };
    prev.rawScore += t.score;
    prev.maxScore += t.maxScore;
    agg.set(attr.id, prev);
  }

  return Array.from(agg.entries()).map(([attributeId, scores]) => ({
    attributeId,
    attributeName: scores.name,
    rawScore: scores.rawScore,
    maxScore: scores.maxScore,
  }));
}
