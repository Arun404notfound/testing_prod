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
 * Each attribute's raw score is first converted to a 1–10 scaled score
 * (via bigFiveScale when useBigFiveScaling=true, or proportional mapping
 * otherwise). Those per-attribute scaled scores are then combined using
 * the competency's scoringFormula:
 *
 *   WEIGHTED_AVERAGE  — Σ(scaledScore × weight) ÷ Σ(weights)
 *   SIMPLE_AVERAGE    — Σ(scaledScore) ÷ n  (weights ignored)
 *   HIGHEST_ATTRIBUTE — max(scaledScores)
 *   LOWEST_ATTRIBUTE  — min(scaledScores)
 *   GEOMETRIC_MEAN    — (Π scaledScores)^(1/n)
 *
 * @param useBigFiveScaling  When true each attribute raw score is converted
 *   via bigFiveScale() before combining — matching the Excel scoring formula.
 *   When false the raw/max ratio is used (MCQ assessments).
 */
export function computeCompetencyScores(
  attributeScores: AttributeScoreInput[],
  competencyMaps: CompetencyMap[],
  useBigFiveScaling = false,
): CompetencyScoreOutput[] {
  const attrMap = new Map<string, AttributeScoreInput>();
  for (const a of attributeScores) {
    attrMap.set(a.attributeId, a);
  }

  const results: CompetencyScoreOutput[] = [];

  for (const comp of competencyMaps) {
    const formula = comp.scoringFormula;
    // SIMPLE_AVERAGE treats all attributes equally regardless of weight
    const useSimpleAverage = formula === SCORING_FORMULAS.SIMPLE_AVERAGE;

    // ── Step 1: compute per-attribute scaled scores ──────────────────────────
    type AttrData = {
      scaledScore: number;
      weight: number;
      rawScore: number;
      maxScore: number;
    };
    const attrData: AttrData[] = [];

    for (const mapping of comp.attributes) {
      const attrScore = attrMap.get(mapping.attributeId);
      if (!attrScore) continue;

      const effectiveWeight = useSimpleAverage ? 1 : mapping.weight;

      let scaledScore: number;
      if (useBigFiveScaling) {
        // Infer per-attribute min from observed maxScore so the formula
        // adapts to both Likert-only [1,5] and Likert+FC [4,14] ranges.
        const attrMin = Math.round((attrScore.maxScore * BIG_FIVE_MIN) / BIG_FIVE_MAX);
        scaledScore = bigFiveScale(attrScore.rawScore, attrMin, attrScore.maxScore);
      } else {
        if (attrScore.maxScore <= 0) continue;
        const pct = attrScore.rawScore / attrScore.maxScore;
        scaledScore = Math.max(1, Math.min(10, 1 + pct * 9));
      }

      attrData.push({
        scaledScore,
        weight: effectiveWeight,
        rawScore: attrScore.rawScore,
        maxScore: attrScore.maxScore,
      });
    }

    if (attrData.length === 0) continue;

    // ── Step 2: aggregate raw/max for reporting ──────────────────────────────
    const totalWeight = attrData.reduce((s, d) => s + d.weight, 0);
    const weightedRaw = attrData.reduce((s, d) => s + d.rawScore * d.weight, 0);
    const weightedMax = attrData.reduce((s, d) => s + d.maxScore * d.weight, 0);

    // ── Step 3: apply combination formula ────────────────────────────────────
    let scaledScore: number;

    switch (formula) {
      case SCORING_FORMULAS.HIGHEST_ATTRIBUTE:
        // Peak strength — one outstanding trait lifts the whole competency
        scaledScore = Math.max(...attrData.map((d) => d.scaledScore));
        break;

      case SCORING_FORMULAS.LOWEST_ATTRIBUTE:
        // Weakest link — every attribute must be strong
        scaledScore = Math.min(...attrData.map((d) => d.scaledScore));
        break;

      case SCORING_FORMULAS.GEOMETRIC_MEAN: {
        // Balanced — extreme lows cannot be offset by highs
        const n = attrData.length;
        const product = attrData.reduce((p, d) => p * d.scaledScore, 1);
        scaledScore = Math.pow(product, 1 / n);
        break;
      }

      // WEIGHTED_AVERAGE (default) and SIMPLE_AVERAGE (weight overridden to 1)
      default:
        scaledScore =
          totalWeight > 0
            ? attrData.reduce((s, d) => s + d.scaledScore * d.weight, 0) / totalWeight
            : 1;
    }

    // Clamp and round to 1 decimal
    scaledScore = Math.round(Math.max(1, Math.min(10, scaledScore)) * 10) / 10;
    // Express percent as position on 1–10 scale → 0–100 %
    const percent = Math.round(((scaledScore - 1) / 9) * 1000) / 10;

    results.push({
      competencyId: comp.competencyId,
      competencyName: comp.competencyName,
      rawScore: weightedRaw,
      maxScore: weightedMax,
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
