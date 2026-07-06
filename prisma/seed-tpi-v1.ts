/**
 * TimespPro Personality Inventory v1.0 — full question seed
 *
 * Replaces the old 50-question assessment with the official TPI v1.0 design:
 *   - 30 Likert items (mixed polarity: positive items scored 1–5, negative reverse-scored)
 *   - 40 Forced-choice triads (Q1–Q20 positive scoring, Q21–Q40 negative scoring)
 *
 * Each of the 30 facets appears:
 *   - 1× in Likert
 *   - 4× in Forced-choice (2 positive triads + 2 negative triads)
 *
 * Per-facet raw score range: 1 (Likert) + 4×1 (FC) = 5  min
 *                            5 (Likert) + 4×3 (FC) = 17 max
 * Conversion to 10-pt scale: 1 + (raw − 5) × 9 / 12
 *
 * Scoring engine already handles polarity correctly:
 *   Likert NEGATIVE  → reverse-scored (6 − response)
 *   Triad  NEGATIVE  → Most=1, Not-chosen=2, Least=3
 *
 * WARNING — destructive: this clears ALL pool Likert items and pool Triad
 * groups (assessmentId = null) before recreating them. Because
 * AssessmentCompositionItem.sourceTriad/sourceItem cascade-delete on their
 * pool source, running this against a database where an assessment already
 * has pool items attached (and candidates have attempted it) will rip those
 * questions out of the assessment's composition. Only run this against a
 * fresh/pre-launch database. If the pool is already partially seeded and in
 * use, use seed-tpi-v1-append-missing-triads.ts instead — it only inserts
 * what's missing and never deletes.
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { ATTRIBUTES, LIKERT_ITEMS, TRIADS } from "./tpi-v1-data";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

// ── Verification: each facet must appear exactly 4× in FC triads ─────────────

function verifyFacetCoverage() {
  const counts = new Map<string, number>();
  for (const t of TRIADS) {
    for (const s of t.statements) {
      counts.set(s.code, (counts.get(s.code) ?? 0) + 1);
    }
  }
  const wrong = [...counts.entries()].filter(([, n]) => n !== 4);
  if (wrong.length > 0) {
    throw new Error(`Facet coverage error — expected 4 appearances each: ${JSON.stringify(wrong)}`);
  }
  const missing = ATTRIBUTES.map((a) => a.code).filter((c) => !counts.has(c));
  if (missing.length > 0) throw new Error(`Missing facets in triads: ${missing.join(", ")}`);
  console.log("✅ Facet coverage verified: all 30 facets appear 4× in FC triads");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  verifyFacetCoverage();

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found. Run the main seed first.");

  // Clear existing pool questions (assessmentId = null means they are pool-only)
  const existingLikert = await prisma.assessmentItem.count({ where: { assessmentId: null } });
  const existingTriads = await prisma.triadGroup.count({ where: { assessmentId: null } });
  if (existingLikert > 0 || existingTriads > 0) {
    await prisma.assessmentItem.deleteMany({ where: { assessmentId: null } });
    await prisma.triadGroup.deleteMany({ where: { assessmentId: null } });
    console.log(`Cleared ${existingLikert} pool Likert items and ${existingTriads} pool triad groups.`);
  }

  // Build attribute lookups
  const dbAttrs = await prisma.attribute.findMany({ where: { tenantId: tenant.id } });
  const attrByCode  = new Map(dbAttrs.map((a) => [a.code, a]));
  const attrByTrait = new Map(dbAttrs.map((a) => [a.name.toLowerCase(), a]));

  const missingCodes = ATTRIBUTES.map((a) => a.code).filter((c) => !attrByCode.has(c));
  if (missingCodes.length > 0) {
    console.warn(`⚠ Missing attribute codes in DB: ${missingCodes.join(", ")} — run seed-competencies first`);
  }

  // Create 30 pool Likert items (no assessment, no section)
  for (let i = 0; i < LIKERT_ITEMS.length; i++) {
    const item = LIKERT_ITEMS[i];
    const attrDef = ATTRIBUTES.find((a) => a.code === item.code)!;
    const attr = attrByCode.get(item.code);
    await prisma.assessmentItem.create({
      data: {
        itemType: "LIKERT",
        prompt: item.prompt,
        factor: attrDef.factor,
        trait: attrDef.trait,
        definition: attrDef.definition,
        polarity: item.polarity,
        attributeId: attr?.id ?? null,
        displayOrder: i,
      },
    });
  }
  console.log("✅ Created 30 pool Likert items (no assessment attached)");

  // Create 40 pool Triad groups (no assessment, no section)
  for (let t = 0; t < TRIADS.length; t++) {
    const triad = TRIADS[t];
    const group = await prisma.triadGroup.create({
      data: {
        title: triad.stem,
        tenantId: tenant.id,
        displayOrder: t,
        statements: {
          create: triad.statements.map((st, s) => {
            const attrDef = ATTRIBUTES.find((a) => a.code === st.code)!;
            const attrRow = attrByTrait.get(attrDef.trait.toLowerCase());
            return {
              statementText: st.text,
              factor: attrDef.factor,
              trait: attrDef.trait,
              definition: attrDef.definition,
              polarity: triad.polarity,
              attributeId: attrRow?.id ?? null,
              displayOrder: s,
            };
          }),
        },
      },
    });
    void group;
  }
  console.log("✅ Created 40 pool Triad groups (no assessment attached)");

  console.log("\n🎉 TPI v1.0 question pool seed complete!");
  console.log(`   Likert items : 30 (mixed polarity) — free-floating pool`);
  console.log(`   Triads       : 40 (Q1–Q20 positive, Q21–Q40 negative) — free-floating pool`);
  console.log(`   Total        : 70 questions, no assessment container needed`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
