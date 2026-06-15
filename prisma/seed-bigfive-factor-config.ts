import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

const FACTOR_META: Record<string, { displayName: string; displayOrder: number }> = {
  "Extraversion":          { displayName: "Extraversion",          displayOrder: 1 },
  "Agreeableness":         { displayName: "Agreeableness",         displayOrder: 2 },
  "Conscientiousness":     { displayName: "Conscientiousness",     displayOrder: 3 },
  "Openness to experience":{ displayName: "Openness to Experience",displayOrder: 4 },
  "Emotional stability":   { displayName: "Emotional Stability",  displayOrder: 5 },
};

async function main() {
  // Resolve the default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "techgrah-demo" },
    update: {},
    create: {
      name: "TechGrah Demo Client",
      slug: "techgrah-demo",
      primaryColor: "#1f2937",
      secondaryColor: "#4b5563",
      accentColor: "#1d4ed8",
    },
    select: { id: true },
  });
  const tenantId = tenant.id;

  // Get all attributes that have a Big Five category
  const attributes = await prisma.attribute.findMany({
    where: { tenantId, category: { in: Object.keys(FACTOR_META) } },
    select: { id: true, category: true, name: true },
  });

  const byCategory = attributes.reduce<Record<string, typeof attributes>>((acc, a) => {
    const cat = a.category!;
    (acc[cat] ??= []).push(a);
    return acc;
  }, {});

  for (const [factor, meta] of Object.entries(FACTOR_META)) {
    const attrs = byCategory[factor] ?? [];
    if (attrs.length === 0) {
      console.log(`  skipping ${factor} — no attributes found`);
      continue;
    }

    let config = await prisma.bigFiveFactorConfig.findFirst({ where: { factor, tenantId } });
    if (!config) {
      config = await prisma.bigFiveFactorConfig.create({
        data: {
          tenantId,
          factor,
          displayName: meta.displayName,
          displayOrder: meta.displayOrder,
          scoringFormula: "WEIGHTED_AVERAGE",
        },
      });
    } else {
      config = await prisma.bigFiveFactorConfig.update({
        where: { id: config.id },
        data: { displayName: meta.displayName, displayOrder: meta.displayOrder },
      });
    }

    for (const attr of attrs) {
      await prisma.bigFiveFactorAttributeMap.upsert({
        where: { factorId_attributeId: { factorId: config.id, attributeId: attr.id } },
        create: { factorId: config.id, attributeId: attr.id, weight: 1.0 },
        update: {},
      });
    }

    console.log(`  ✓ ${factor}: ${attrs.length} attributes mapped`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
