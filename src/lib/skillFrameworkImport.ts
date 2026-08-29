import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const BANDS = ["Developing", "Intermediate", "Proficient", "Expert"] as const;
type Band = (typeof BANDS)[number];

type BandContent = { proficiencyDescription: string; behaviouralImplications: string; watchOuts: string };
type Project = { title: string; whatToDo: string; howToDoIt: string; evidence: string };

/** One Sub-Skill Mapping bullet, parsed from its "Parent Skill: Sub-skill name" text. */
type SubSkillRef = { skillName: string; subSkillName: string };

type FrameworkRow = {
  domain: string;
  competency: string;
  definition: string;
  subSkills: SubSkillRef[];
};

type ReportContentRow = {
  bands: Record<Band, BandContent>;
  strengthStatement: string | null;
  developmentNeedStatement: string | null;
  projects: Project[];
};

export type SkillFrameworkImportResult = {
  skillFrameworkId: string;
  skillFrameworkName: string;
  domainCount: number;
  competencyCount: number;
  mappingCount: number;
  skillsCreated: string[];
  subSkillsCreated: string[];
  warnings: string[];
};

function cell(row: unknown[], index: number): string {
  const v = row[index];
  return v === undefined || v === null ? "" : String(v).trim();
}

/** Splits a "\n"-delimited (optionally "•"-prefixed) bullet block into clean lines. */
function extractBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);
}

/** Parses a "Parent Skill: Sub-skill name" bullet. Returns null (and the caller
 *  should warn) if the bullet has no colon to split on. */
function parseSubSkillBullet(bullet: string): SubSkillRef | null {
  const idx = bullet.indexOf(":");
  if (idx === -1) return null;
  const skillName = bullet.slice(0, idx).trim();
  const subSkillName = bullet.slice(idx + 1).trim();
  if (!skillName || !subSkillName) return null;
  return { skillName, subSkillName };
}

function parseBandCell(raw: string): BandContent {
  const clean = raw.replace(/\r\n/g, "\n").trim();
  const behavIdx = clean.indexOf("Behavioural Implications");
  const watchIdx = clean.indexOf("Watch-outs");

  const descEnd = behavIdx === -1 ? clean.length : behavIdx;
  const proficiencyDescription = clean
    .slice(0, descEnd)
    .replace(/^Proficiency Description/i, "")
    .trim();

  const behavEnd = watchIdx === -1 ? clean.length : watchIdx;
  const behavText = behavIdx === -1 ? "" : clean.slice(behavIdx + "Behavioural Implications".length, behavEnd);
  const watchText = watchIdx === -1 ? "" : clean.slice(watchIdx + "Watch-outs".length);

  return {
    proficiencyDescription,
    behaviouralImplications: extractBullets(behavText).join("\n"),
    watchOuts: extractBullets(watchText).join("\n"),
  };
}

function parseProjectCell(raw: string): Project | null {
  const clean = raw.replace(/\r\n/g, "\n").trim();
  if (!clean) return null;

  const whatIdx = clean.indexOf("What to do");
  const howIdx = clean.indexOf("How to do it");
  const evidIdx = clean.indexOf("Evidence");

  const titleEnd = whatIdx === -1 ? clean.length : whatIdx;
  const title = clean.slice(0, titleEnd).trim();

  const whatEnd = howIdx === -1 ? (evidIdx === -1 ? clean.length : evidIdx) : howIdx;
  const whatToDo = whatIdx === -1 ? "" : clean.slice(whatIdx + "What to do".length, whatEnd);

  const howEnd = evidIdx === -1 ? clean.length : evidIdx;
  const howToDoIt = howIdx === -1 ? "" : clean.slice(howIdx + "How to do it".length, howEnd);

  const evidence = evidIdx === -1 ? "" : clean.slice(evidIdx + "Evidence".length);

  return {
    title,
    whatToDo: extractBullets(whatToDo).join("\n"),
    howToDoIt: extractBullets(howToDoIt).join("\n"),
    evidence: extractBullets(evidence).join("\n"),
  };
}

function findHeaderRowIndex(rows: unknown[][], firstColMatch: RegExp): number {
  for (let i = 0; i < rows.length; i++) {
    const first = cell(rows[i], 0);
    if (firstColMatch.test(first)) return i;
  }
  return -1;
}

function parseFrameworkSheet(sheet: XLSX.WorkSheet, warnings: string[]): FrameworkRow[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  const headerIdx = findHeaderRowIndex(rows, /^domain$/i);
  if (headerIdx === -1) return [];

  const out: FrameworkRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const domain = cell(row, 0);
    const competency = cell(row, 1);
    if (!domain || !competency) continue;
    const definition = cell(row, 2);
    const subSkillBullets = extractBullets(cell(row, 4));
    const subSkills: SubSkillRef[] = [];
    for (const bullet of subSkillBullets) {
      const ref = parseSubSkillBullet(bullet);
      if (!ref) {
        warnings.push(`Skill "${competency}": Sub-Skill Mapping bullet "${bullet}" isn't in "Parent Skill: Sub-skill name" format — skipped.`);
        continue;
      }
      subSkills.push(ref);
    }
    out.push({ domain, competency, definition, subSkills });
  }
  return out;
}

function parseReportContentSheet(sheet: XLSX.WorkSheet): ReportContentRow[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  const headerIdx = findHeaderRowIndex(rows, /^domain$/i);
  if (headerIdx === -1) return [];

  const out: ReportContentRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const domain = cell(row, 0);
    const competency = cell(row, 1);
    if (!domain || !competency) continue;

    const bands: Record<Band, BandContent> = {
      Developing: parseBandCell(cell(row, 2)),
      Intermediate: parseBandCell(cell(row, 3)),
      Proficient: parseBandCell(cell(row, 4)),
      Expert: parseBandCell(cell(row, 5)),
    };
    const strengthStatement = cell(row, 6) || null;
    const developmentNeedStatement = cell(row, 7) || null;
    const projects = [cell(row, 8), cell(row, 9), cell(row, 10)]
      .map(parseProjectCell)
      .filter((p): p is Project => p !== null);

    out.push({ bands, strengthStatement, developmentNeedStatement, projects });
  }
  return out;
}

export function parseSkillFrameworkWorkbook(bytes: Uint8Array): {
  framework: FrameworkRow[];
  reportContent: ReportContentRow[];
  warnings: string[];
} {
  const workbook = XLSX.read(bytes, { type: "array" });
  const warnings: string[] = [];

  const frameworkSheetName = workbook.SheetNames.find((n) => /skill framework/i.test(n)) ?? workbook.SheetNames[0];
  const reportContentSheetName = workbook.SheetNames.find((n) => /report content/i.test(n)) ?? workbook.SheetNames[1];

  const framework = frameworkSheetName ? parseFrameworkSheet(workbook.Sheets[frameworkSheetName], warnings) : [];
  const reportContent = reportContentSheetName ? parseReportContentSheet(workbook.Sheets[reportContentSheetName]) : [];

  if (framework.length === 0) {
    warnings.push("No Domain/Skill rows found on the framework sheet. Check the file matches the expected template.");
  }
  if (reportContent.length !== framework.length) {
    warnings.push(
      `Framework sheet has ${framework.length} skill rows but Report Content has ${reportContent.length}. Rows are matched by position — check row order matches on both sheets.`,
    );
  }

  return { framework, reportContent, warnings };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-\s]/g, "");
}

export async function importSkillFrameworkFromWorkbook(args: {
  tenantId: string;
  skillFrameworkName: string;
  skillFrameworkSlug?: string | null;
  skillFrameworkDescription?: string | null;
  bytes: Uint8Array;
}): Promise<SkillFrameworkImportResult> {
  const { tenantId, skillFrameworkName, bytes } = args;
  const { framework, reportContent, warnings } = parseSkillFrameworkWorkbook(bytes);

  const skillFramework = await prisma.skillFramework.upsert({
    where: { tenantId_name: { tenantId, name: skillFrameworkName } },
    create: {
      tenantId,
      name: skillFrameworkName,
      slug: args.skillFrameworkSlug ?? null,
      description: args.skillFrameworkDescription ?? null,
    },
    update: {},
  });

  // Skill/Sub-Skill resolution is two levels, unlike Job Role's flat
  // tenant-wide Attribute lookup — a Sub-Skill always belongs to a parent
  // Skill (SubSkill.skillId is required), so each is find-or-created in
  // that order. Cached in memory once, updated as new rows are created.
  const existingSkills = await prisma.skill.findMany({ where: { tenantId }, include: { subSkills: true } });
  const skillByNormalizedName = new Map(
    existingSkills.map((s) => [
      normalizeName(s.name),
      { id: s.id, subSkillByNormalizedName: new Map(s.subSkills.map((ss) => [normalizeName(ss.name), ss])) },
    ]),
  );
  const skillsCreated: string[] = [];
  const subSkillsCreated: string[] = [];

  async function resolveSubSkill(ref: SubSkillRef): Promise<{ id: string }> {
    const normalizedSkill = normalizeName(ref.skillName);
    let skillEntry = skillByNormalizedName.get(normalizedSkill);
    if (!skillEntry) {
      const count = await prisma.skill.count({ where: { tenantId } });
      const skill = await prisma.skill.create({ data: { tenantId, name: ref.skillName, displayOrder: count } });
      skillEntry = { id: skill.id, subSkillByNormalizedName: new Map() };
      skillByNormalizedName.set(normalizedSkill, skillEntry);
      skillsCreated.push(ref.skillName);
    }

    const normalizedSubSkill = normalizeName(ref.subSkillName);
    let subSkill = skillEntry.subSkillByNormalizedName.get(normalizedSubSkill);
    if (!subSkill) {
      const count = await prisma.subSkill.count({ where: { skillId: skillEntry.id } });
      subSkill = await prisma.subSkill.create({ data: { skillId: skillEntry.id, name: ref.subSkillName, displayOrder: count } });
      skillEntry.subSkillByNormalizedName.set(normalizedSubSkill, subSkill);
      subSkillsCreated.push(`${ref.skillName}: ${ref.subSkillName}`);
    }
    return subSkill;
  }

  const domainNames = [...new Set(framework.map((r) => r.domain))];
  const domainByName = new Map<string, { id: string }>();
  for (const [i, name] of domainNames.entries()) {
    const domain = await prisma.skillDomain.upsert({
      where: { skillFrameworkId_name: { skillFrameworkId: skillFramework.id, name } },
      create: { tenantId, skillFrameworkId: skillFramework.id, name, displayOrder: i },
      update: { displayOrder: i },
    });
    domainByName.set(name, domain);
  }

  let mappingCount = 0;

  for (const [i, row] of framework.entries()) {
    const domain = domainByName.get(row.domain)!;
    const competency = await prisma.skillCompetency.upsert({
      where: { tenantId_skillFrameworkId_name: { tenantId, skillFrameworkId: skillFramework.id, name: row.competency } },
      create: {
        tenantId,
        skillFrameworkId: skillFramework.id,
        skillDomainId: domain.id,
        name: row.competency,
        description: row.definition,
        reportDescription: row.definition,
        displayOrder: i,
        proficiencyScale: "MATURITY_4",
      },
      update: {
        skillDomainId: domain.id,
        description: row.definition,
        reportDescription: row.definition,
        displayOrder: i,
        proficiencyScale: "MATURITY_4",
      },
    });

    for (const ref of row.subSkills) {
      const subSkill = await resolveSubSkill(ref);
      await prisma.skillCompetencyMap.upsert({
        where: { subSkillId_skillCompetencyId: { subSkillId: subSkill.id, skillCompetencyId: competency.id } },
        create: { subSkillId: subSkill.id, skillCompetencyId: competency.id, weight: 1.0 },
        update: { weight: 1.0 },
      });
      mappingCount += 1;
    }

    const rc = reportContent[i];
    if (!rc) {
      warnings.push(`No matching Report Content row for "${row.competency}" (position ${i + 1}) — band content/statements/projects not set.`);
      continue;
    }

    await prisma.skillCompetency.update({
      where: { id: competency.id },
      data: {
        strengthStatement: rc.strengthStatement,
        developmentNeedStatement: rc.developmentNeedStatement,
      },
    });

    for (const band of BANDS) {
      const content = rc.bands[band];
      await prisma.skillCompetencyBandContent.upsert({
        where: { skillCompetencyId_band: { skillCompetencyId: competency.id, band } },
        create: { skillCompetencyId: competency.id, band, ...content },
        update: { ...content },
      });
    }

    await prisma.skillDevelopmentProject.deleteMany({ where: { skillCompetencyId: competency.id } });
    for (const [pIdx, project] of rc.projects.entries()) {
      await prisma.skillDevelopmentProject.create({
        data: { skillCompetencyId: competency.id, displayOrder: pIdx, ...project },
      });
    }
  }

  return {
    skillFrameworkId: skillFramework.id,
    skillFrameworkName: skillFramework.name,
    domainCount: domainNames.length,
    competencyCount: framework.length,
    mappingCount,
    skillsCreated,
    subSkillsCreated,
    warnings,
  };
}
