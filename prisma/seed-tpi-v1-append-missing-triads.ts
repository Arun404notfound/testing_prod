/**
 * Non-destructive append for TPI v1.0 Forced-Choice triads.
 *
 * Use this instead of seed-tpi-v1.ts when the pool already has some triads
 * attached to a live assessment (with candidate attempts against them).
 * seed-tpi-v1.ts deletes all pool TriadGroup rows first, which cascades to
 * AssessmentCompositionItem and would rip already-used triads out of any
 * assessment that references them. This script only INSERTS triads whose
 * stem ("title") isn't already present in the pool — it never deletes or
 * updates existing rows.
 *
 * After running, use the assessment builder's "Add from pool" (bulk) action
 * to attach the newly inserted triads to the live assessment.
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { ATTRIBUTES, TRIADS } from "./tpi-v1-data";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found. Run the main seed first.");

  const dbAttrs = await prisma.attribute.findMany({ where: { tenantId: tenant.id } });
  const attrByTrait = new Map(dbAttrs.map((a) => [a.name.toLowerCase(), a]));

  const existingPoolGroups = await prisma.triadGroup.findMany({
    where: { assessmentId: null, tenantId: tenant.id },
    select: { title: true, displayOrder: true },
  });
  const existingTitles = new Set(existingPoolGroups.map((g) => g.title));
  const maxOrder = existingPoolGroups.reduce((m, g) => Math.max(m, g.displayOrder), -1);

  const missing = TRIADS.filter((t) => !existingTitles.has(t.stem));

  console.log(`Pool currently has ${existingPoolGroups.length} triad group(s).`);
  console.log(`${missing.length} triad(s) from the 40-item spec are missing and will be added.`);

  if (missing.length === 0) {
    console.log("Nothing to do — pool already has all 40 triads.");
    return;
  }

  for (let i = 0; i < missing.length; i++) {
    const triad = missing[i];
    await prisma.triadGroup.create({
      data: {
        title: triad.stem,
        tenantId: tenant.id,
        displayOrder: maxOrder + 1 + i,
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
    console.log(`  + added: "${triad.stem}"`);
  }

  console.log(`\n✅ Added ${missing.length} missing triad(s) to the pool (existing ${existingPoolGroups.length} untouched).`);
  console.log("Next: in the assessment builder, use 'Add from pool' to attach the new triads to the live assessment.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
