import type { ItemType } from "@/generated/prisma/enums";
import { seededShuffle } from "@/lib/shuffle";

/** Up to 3 question-level images, ordered. Empty/absent for every question authored before this feature. */
type ItemMedia = { images?: string[]; audioUrl?: string | null };
/** One optional image per answer option (e.g. a graph as one of the choices). */
type OptionWithImage = { optionId: string; label: string; imageUrl?: string | null };

export type TestBlock =
  | {
      kind: "legacy_mcq";
      key: string;
      questionId: string;
      section: string;
      questionText: string;
      options: { value: number; label: string }[];
    }
  | ({
      kind: "item_mcq";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      options: OptionWithImage[];
    } & ItemMedia)
  | ({
      kind: "item_tf";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      options: OptionWithImage[];
    } & ItemMedia)
  | ({
      kind: "likert";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      /** Set only for Survey Likert items authored with a custom scale; absent (undefined) for every legacy Psychometric Likert item, which keeps their candidate-side rendering byte-identical. */
      scale?: { min: number; max: number; minLabel: string; maxLabel: string };
    } & ItemMedia)
  | ({
      kind: "item_mcq_multi";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      options: OptionWithImage[];
    } & ItemMedia)
  | ({
      kind: "open_ended";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      helpText?: string | null;
    } & ItemMedia)
  | {
      kind: "triad";
      key: string;
      groupId: string;
      section: string;
      title: string;
      statements: { id: string; text: string }[];
    }
  | ({
      kind: "sjt";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      options: OptionWithImage[];
    } & ItemMedia)
  | {
      kind: "case_study";
      key: string;
      caseStudyId: string;
      section: string;
      title: string;
      passageText: string;
      subQuestions: ({
        itemId: string;
        prompt: string;
        options: OptionWithImage[];
      } & ItemMedia)[];
    };

type SectionLike = { title: string; displayOrder: number };

function sectionSortKey(sections: SectionLike[], title: string): number {
  const match = sections.find((s) => s.title === title);
  return match?.displayOrder ?? 999;
}

/** Skip phase-2 MCQ items when legacy Question links exist (seeded demo). */
function skipEmbeddedMcqItems(assessmentType: string, legacyCount: number): boolean {
  return assessmentType === "KNOWLEDGE_MCQ" && legacyCount > 0;
}

function pushItemBlock(
  blocks: TestBlock[],
  item: {
    id: string;
    itemType: ItemType;
    prompt: string;
    helpText?: string | null;
    /** Null for pool/bank items (sectionId unset) — they're only ever placed into a section via the AssessmentCompositionItem row that pulls them in, hence the fallback param below. */
    section: SectionLike | null;
    options: { id: string; label: string; value: string; displayOrder: number; imageUrl?: string | null }[];
    likertScale?: { minValue: number; maxValue: number; minLabel: string; maxLabel: string } | null;
    images?: { url: string; displayOrder: number }[];
    audioUrl?: string | null;
  },
  skipMcqTf: boolean,
  fallbackSectionTitle = "General",
): void {
  const sectionTitle = item.section?.title ?? fallbackSectionTitle;
  const media: ItemMedia = {
    images: item.images && item.images.length > 0 ? [...item.images].sort((a, b) => a.displayOrder - b.displayOrder).map((i) => i.url) : undefined,
    audioUrl: item.audioUrl ?? undefined,
  };
  if (item.itemType === "LIKERT") {
    blocks.push({
      kind: "likert",
      key: `likert:${item.id}`,
      itemId: item.id,
      section: sectionTitle,
      prompt: item.prompt,
      ...media,
      ...(item.likertScale
        ? {
            scale: {
              min: item.likertScale.minValue,
              max: item.likertScale.maxValue,
              minLabel: item.likertScale.minLabel,
              maxLabel: item.likertScale.maxLabel,
            },
          }
        : {}),
    });
    return;
  }
  if (item.itemType === "OPEN_ENDED") {
    blocks.push({
      kind: "open_ended",
      key: `open_ended:${item.id}`,
      itemId: item.id,
      section: sectionTitle,
      prompt: item.prompt,
      helpText: item.helpText ?? null,
      ...media,
    });
    return;
  }
  if (skipMcqTf && (item.itemType === "MCQ_SINGLE" || item.itemType === "TRUE_FALSE")) {
    return;
  }
  if (item.itemType === "MCQ_SINGLE" && item.options.length > 0) {
    const opts = [...item.options].sort((a, b) => a.displayOrder - b.displayOrder);
    blocks.push({
      kind: "item_mcq",
      key: `item_mcq:${item.id}`,
      itemId: item.id,
      section: sectionTitle,
      prompt: item.prompt,
      options: opts.map((o) => ({ optionId: o.id, label: o.label || o.value, imageUrl: o.imageUrl ?? undefined })),
      ...media,
    });
    return;
  }
  if (item.itemType === "MCQ_MULTIPLE" && item.options.length > 0) {
    const opts = [...item.options].sort((a, b) => a.displayOrder - b.displayOrder);
    blocks.push({
      kind: "item_mcq_multi",
      key: `item_mcq_multi:${item.id}`,
      itemId: item.id,
      section: sectionTitle,
      prompt: item.prompt,
      options: opts.map((o) => ({ optionId: o.id, label: o.label || o.value, imageUrl: o.imageUrl ?? undefined })),
      ...media,
    });
    return;
  }
  if (item.itemType === "SJT" && item.options.length > 0) {
    const opts = [...item.options].sort((a, b) => a.displayOrder - b.displayOrder);
    blocks.push({
      kind: "sjt",
      key: `sjt:${item.id}`,
      itemId: item.id,
      section: sectionTitle,
      prompt: item.prompt,
      options: opts.map((o) => ({ optionId: o.id, label: o.label || o.value, imageUrl: o.imageUrl ?? undefined })),
      ...media,
    });
    return;
  }
  if (item.itemType === "TRUE_FALSE" && item.options.length >= 2) {
    const opts = [...item.options].sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 2);
    blocks.push({
      kind: "item_tf",
      key: `item_tf:${item.id}`,
      itemId: item.id,
      section: sectionTitle,
      prompt: item.prompt,
      options: opts.map((o) => ({ optionId: o.id, label: o.label || o.value, imageUrl: o.imageUrl ?? undefined })),
      ...media,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCaseStudyBlock(cs: any, fallbackSectionTitle: string): TestBlock {
  const subs = [...(cs.subQuestions ?? [])].sort(
    (a: { displayOrder: number }, b: { displayOrder: number }) => a.displayOrder - b.displayOrder,
  );
  return {
    kind: "case_study",
    key: `case_study:${cs.id}`,
    caseStudyId: cs.id,
    section: cs.section?.title ?? fallbackSectionTitle,
    title: cs.title,
    passageText: cs.passageText,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subQuestions: subs.map((sq: any) => ({
      itemId: sq.id,
      prompt: sq.prompt,
      options: [...(sq.options ?? [])]
        .sort((a: { displayOrder: number }, b: { displayOrder: number }) => a.displayOrder - b.displayOrder)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((o: any) => ({ optionId: o.id, label: o.label || o.value, imageUrl: o.imageUrl ?? undefined })),
      images: (sq.images && sq.images.length > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? [...sq.images].sort((a: any, b: any) => a.displayOrder - b.displayOrder).map((i: any) => i.url)
        : undefined,
      audioUrl: sq.audioUrl ?? undefined,
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTestBlocks(assessment: any): TestBlock[] {
  const sections: SectionLike[] = (assessment.sections ?? []).map((s: SectionLike) => ({
    title: s.title,
    displayOrder: s.displayOrder,
  }));
  const skipMcqTf = skipEmbeddedMcqItems(assessment.assessmentType, (assessment.questions ?? []).length);

  const blocks: TestBlock[] = [];

  for (const aq of assessment.questions ?? []) {
    const q = aq.question;
    blocks.push({
      kind: "legacy_mcq",
      key: `legacy:${q.id}`,
      questionId: q.id,
      section: q.section,
      questionText: q.questionText,
      options: [1, 2, 3, 4].map((n) => ({
        value: n,
        label: q[`option${n}` as keyof typeof q] as string,
      })),
    });
  }

  const sortedItems = [...(assessment.items ?? [])]
    .filter((i: { caseStudyId?: string | null }) => !i.caseStudyId)
    .sort((a, b) => {
      const sa = sectionSortKey(sections, a.section.title);
      const sb = sectionSortKey(sections, b.section.title);
      if (sa !== sb) return sa - sb;
      return a.displayOrder - b.displayOrder;
    });
  for (const item of sortedItems) {
    pushItemBlock(blocks, item, skipMcqTf);
  }

  const seenCaseStudy = new Set<string>();
  const sortedCaseStudies = [...(assessment.caseStudies ?? [])].sort((a, b) => {
    const sa = sectionSortKey(sections, a.section?.title ?? "");
    const sb = sectionSortKey(sections, b.section?.title ?? "");
    if (sa !== sb) return sa - sb;
    return a.displayOrder - b.displayOrder;
  });
  for (const cs of sortedCaseStudies) {
    if (seenCaseStudy.has(cs.id)) continue;
    if ((cs.subQuestions ?? []).length === 0) continue;
    seenCaseStudy.add(cs.id);
    blocks.push(buildCaseStudyBlock(cs, "General"));
  }

  const seenTriad = new Set<string>();
  const sortedTriads = [...(assessment.triadGroups ?? [])].sort((a, b) => {
    const sa = sectionSortKey(sections, a.section.title);
    const sb = sectionSortKey(sections, b.section.title);
    if (sa !== sb) return sa - sb;
    return a.displayOrder - b.displayOrder;
  });
  for (const g of sortedTriads) {
    if (seenTriad.has(g.id)) continue;
    seenTriad.add(g.id);
    const stmts = [...(g.statements ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    blocks.push({
      kind: "triad",
      key: `triad:${g.id}`,
      groupId: g.id,
      section: g.section.title,
      title: g.title,
      statements: stmts.map((s) => ({ id: s.id, text: s.statementText })),
    });
  }

  const sortedComp = [...(assessment.compositionItems ?? [])].sort((a, b) => {
    const sa = sectionSortKey(sections, a.section?.title ?? "");
    const sb = sectionSortKey(sections, b.section?.title ?? "");
    if (sa !== sb) return sa - sb;
    return a.displayOrder - b.displayOrder;
  });
  const seenLikert = new Set(blocks.filter((b) => b.kind === "likert").map((b) => b.itemId));

  for (const row of sortedComp) {
    if (row.sourceItem?.itemType === "LIKERT") {
      const item = row.sourceItem;
      if (seenLikert.has(item.id)) continue;
      seenLikert.add(item.id);
      blocks.push({
        kind: "likert",
        key: `likert:${item.id}`,
        itemId: item.id,
        section: item.section?.title ?? row.section?.title ?? "Imported",
        prompt: item.prompt,
        images: (item.images && item.images.length > 0)
          ? [...item.images].sort((a: { displayOrder: number }, b: { displayOrder: number }) => a.displayOrder - b.displayOrder).map((i: { url: string }) => i.url)
          : undefined,
        audioUrl: item.audioUrl ?? undefined,
        ...(item.likertScale
          ? {
              scale: {
                min: item.likertScale.minValue,
                max: item.likertScale.maxValue,
                minLabel: item.likertScale.minLabel,
                maxLabel: item.likertScale.maxLabel,
              },
            }
          : {}),
      });
    } else if (row.sourceItem) {
      pushItemBlock(blocks, row.sourceItem, false, row.section?.title ?? "Imported");
    }
    if (row.sourceTriad) {
      const g = row.sourceTriad;
      if (seenTriad.has(g.id)) continue;
      seenTriad.add(g.id);
      const stmts = [...(g.statements ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
      blocks.push({
        kind: "triad",
        key: `triad:${g.id}`,
        groupId: g.id,
        section: g.section?.title ?? row.section?.title ?? "Imported",
        title: g.title,
        statements: stmts.map((s) => ({ id: s.id, text: s.statementText })),
      });
    }
    if (row.sourceCaseStudy) {
      const cs = row.sourceCaseStudy;
      if (seenCaseStudy.has(cs.id)) continue;
      if ((cs.subQuestions ?? []).length === 0) continue;
      seenCaseStudy.add(cs.id);
      blocks.push(buildCaseStudyBlock(cs, row.section?.title ?? "Imported"));
    }
  }

  const withOrder = blocks.map((b, i) => ({
    b,
    i,
    sd: sectionSortKey(sections, b.section),
  }));
  withOrder.sort((a, b) => a.sd - b.sd || a.i - b.i);
  return withOrder.map((x) => x.b);
}

/** `seed` should be a stable per-candidate value (e.g. assignment id) so option order stays put across reloads but differs between candidates. */
export function shuffleBlockOptions(blocks: TestBlock[], randomizeOptions: boolean, seed: string): TestBlock[] {
  if (!randomizeOptions) return blocks;
  return blocks.map((b) => {
    if (b.kind === "legacy_mcq") {
      return { ...b, options: seededShuffle(b.options, `${seed}:${b.key}`) };
    }
    if (b.kind === "item_mcq" || b.kind === "item_tf" || b.kind === "sjt" || b.kind === "item_mcq_multi") {
      return { ...b, options: seededShuffle(b.options, `${seed}:${b.key}`) };
    }
    if (b.kind === "case_study") {
      return {
        ...b,
        subQuestions: b.subQuestions.map((sq) => ({
          ...sq,
          options: seededShuffle(sq.options, `${seed}:${b.key}:${sq.itemId}`),
        })),
      };
    }
    return b;
  });
}
