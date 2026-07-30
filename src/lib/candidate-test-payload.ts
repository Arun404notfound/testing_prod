import type { ItemType } from "@/generated/prisma/enums";
import { seededShuffle } from "@/lib/shuffle";

export type TestBlock =
  | {
      kind: "legacy_mcq";
      key: string;
      questionId: string;
      section: string;
      questionText: string;
      options: { value: number; label: string }[];
    }
  | {
      kind: "item_mcq";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      options: { optionId: string; label: string }[];
    }
  | {
      kind: "item_tf";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
      options: { optionId: string; label: string }[];
    }
  | {
      kind: "likert";
      key: string;
      itemId: string;
      section: string;
      prompt: string;
    }
  | {
      kind: "triad";
      key: string;
      groupId: string;
      section: string;
      title: string;
      statements: { id: string; text: string }[];
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
    section: SectionLike;
    options: { id: string; label: string; value: string; displayOrder: number }[];
  },
  skipMcqTf: boolean,
): void {
  if (item.itemType === "LIKERT") {
    blocks.push({
      kind: "likert",
      key: `likert:${item.id}`,
      itemId: item.id,
      section: item.section.title,
      prompt: item.prompt,
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
      section: item.section.title,
      prompt: item.prompt,
      options: opts.map((o) => ({ optionId: o.id, label: o.label || o.value })),
    });
    return;
  }
  if (item.itemType === "TRUE_FALSE" && item.options.length >= 2) {
    const opts = [...item.options].sort((a, b) => a.displayOrder - b.displayOrder).slice(0, 2);
    blocks.push({
      kind: "item_tf",
      key: `item_tf:${item.id}`,
      itemId: item.id,
      section: item.section.title,
      prompt: item.prompt,
      options: opts.map((o) => ({ optionId: o.id, label: o.label || o.value })),
    });
  }
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

  const sortedItems = [...(assessment.items ?? [])].sort((a, b) => {
    const sa = sectionSortKey(sections, a.section.title);
    const sb = sectionSortKey(sections, b.section.title);
    if (sa !== sb) return sa - sb;
    return a.displayOrder - b.displayOrder;
  });
  for (const item of sortedItems) {
    pushItemBlock(blocks, item, skipMcqTf);
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
      });
    } else if (row.sourceItem) {
      pushItemBlock(blocks, row.sourceItem, false);
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
    if (b.kind === "item_mcq" || b.kind === "item_tf") {
      return { ...b, options: seededShuffle(b.options, `${seed}:${b.key}`) };
    }
    return b;
  });
}
