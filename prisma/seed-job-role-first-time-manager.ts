import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: sqliteUrl }),
});

// ── Data parsed from "First Time Manager Framework and Report Content.xlsx" ──
// See prisma/data/ftm-first-time-manager.json (extracted via openpyxl, not hand-typed).

type BandContent = { proficiencyDescription: string; behaviouralImplications: string; watchOuts: string };
type Project = { title: string; whatToDo: string; howToDoIt: string; evidence: string };

type FrameworkRow = {
  domain: string;
  competency: string;
  definition: string;
  keyBehaviours: string[];
  attributes: string[];
};

type ReportContentRow = {
  domain: string;
  competency: string;
  bands: Record<"Developing" | "Intermediate" | "Proficient" | "Expert", BandContent>;
  strengthStatement: string | null;
  developmentNeedStatement: string | null;
  projects: Project[];
};

const dataPath = path.join(__dirname, "data", "ftm-first-time-manager.json");
const { framework, reportContent } = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as {
  framework: FrameworkRow[];
  reportContent: ReportContentRow[];
};

const JOB_ROLE_NAME = "First-Time Manager";

/**
 * The client's own sheet names this competency differently across its two
 * tabs: "Effective Communication" (framework sheet) vs "Communication and
 * Listening" (report content sheet). Using the framework sheet's name as
 * canonical since it defines the structural Domain/Competency/Attribute
 * graph — flagged back to the client rather than silently treated as fact.
 */
const REPORT_CONTENT_NAME_ALIASES: Record<string, string> = {
  "Communication and Listening": "Effective Communication",
};

function normalizeAttrName(name: string): string {
  return name.toLowerCase().replace(/[-\s]/g, "");
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "techgrah-demo" } });
  if (!tenant) throw new Error("Tenant 'techgrah-demo' not found. Run the main seed first.");
  const tenantId = tenant.id;
  console.log(`Using tenant: ${tenant.name} (${tenantId})`);

  const allAttributes = await prisma.attribute.findMany({ where: { tenantId } });
  const attrByNormalizedName = new Map(allAttributes.map((a) => [normalizeAttrName(a.name), a]));

  const reportContentByName = new Map(
    reportContent.map((r) => [REPORT_CONTENT_NAME_ALIASES[r.competency] ?? r.competency, r]),
  );

  // ── 1. Job Role ─────────────────────────────────────────────────────────
  const jobRole = await prisma.jobRole.upsert({
    where: { tenantId_name: { tenantId, name: JOB_ROLE_NAME } },
    create: {
      tenantId,
      name: JOB_ROLE_NAME,
      slug: "first-time-manager",
      description: "Competency framework for individual contributors newly promoted into people-management roles.",
    },
    update: {},
  });
  console.log(`Job Role: ${jobRole.name} (${jobRole.id})`);

  // ── 2. Domains ───────────────────────────────────────────────────────────
  const domainNames = [...new Set(framework.map((r) => r.domain))];
  const domainByName = new Map<string, { id: string }>();
  for (const [i, name] of domainNames.entries()) {
    const domain = await prisma.domain.upsert({
      where: { jobRoleId_name: { jobRoleId: jobRole.id, name } },
      create: { tenantId, jobRoleId: jobRole.id, name, displayOrder: i },
      update: { displayOrder: i },
    });
    domainByName.set(name, domain);
    console.log(`  + domain: ${name}`);
  }

  // ── 3. Competencies + attribute mappings + band content + projects ──────
  for (const [i, row] of framework.entries()) {
    const domain = domainByName.get(row.domain)!;
    const competency = await prisma.competency.upsert({
      where: { tenantId_jobRoleId_name: { tenantId, jobRoleId: jobRole.id, name: row.competency } },
      create: {
        tenantId,
        jobRoleId: jobRole.id,
        domainId: domain.id,
        name: row.competency,
        description: row.definition,
        reportDescription: row.definition,
        displayOrder: i,
        proficiencyScale: "MATURITY_4",
      },
      update: {
        domainId: domain.id,
        description: row.definition,
        reportDescription: row.definition,
        displayOrder: i,
        proficiencyScale: "MATURITY_4",
      },
    });
    console.log(`  + competency: ${row.competency} [${row.domain}]`);

    // Attribute mappings
    for (const attrName of row.attributes) {
      const attr = attrByNormalizedName.get(normalizeAttrName(attrName));
      if (!attr) {
        console.warn(`    ⚠ attribute "${attrName}" not found in seeded pool, skipping mapping`);
        continue;
      }
      await prisma.attributeCompetencyMap.upsert({
        where: { attributeId_competencyId: { attributeId: attr.id, competencyId: competency.id } },
        create: { attributeId: attr.id, competencyId: competency.id, weight: 1.0 },
        update: { weight: 1.0 },
      });
      console.log(`    mapped: ${attr.name} → ${row.competency}`);
    }

    // Report content (band descriptions + strength/dev statements + projects)
    const rc = reportContentByName.get(row.competency);
    if (!rc) {
      console.warn(`    ⚠ no Report Content row found for "${row.competency}"`);
      continue;
    }

    await prisma.competency.update({
      where: { id: competency.id },
      data: {
        strengthStatement: rc.strengthStatement,
        developmentNeedStatement: rc.developmentNeedStatement,
      },
    });

    for (const band of ["Developing", "Intermediate", "Proficient", "Expert"] as const) {
      const content = rc.bands[band];
      await prisma.competencyBandContent.upsert({
        where: { competencyId_band: { competencyId: competency.id, band } },
        create: {
          competencyId: competency.id,
          band,
          proficiencyDescription: content.proficiencyDescription,
          behaviouralImplications: content.behaviouralImplications,
          watchOuts: content.watchOuts,
        },
        update: {
          proficiencyDescription: content.proficiencyDescription,
          behaviouralImplications: content.behaviouralImplications,
          watchOuts: content.watchOuts,
        },
      });
    }

    // Development projects — replace wholesale to keep displayOrder simple on reseed
    await prisma.developmentProject.deleteMany({ where: { competencyId: competency.id } });
    for (const [pIdx, project] of rc.projects.entries()) {
      await prisma.developmentProject.create({
        data: {
          competencyId: competency.id,
          displayOrder: pIdx,
          title: project.title,
          whatToDo: project.whatToDo,
          howToDoIt: project.howToDoIt,
          evidence: project.evidence,
        },
      });
    }
    console.log(`    + ${rc.projects.length} development projects, 4 band contents`);
  }

  console.log("\n✅ Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
