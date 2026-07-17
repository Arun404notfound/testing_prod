import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const BANDS = ["Developing", "Intermediate", "Proficient", "Expert"] as const;
type Band = (typeof BANDS)[number];

type BandContent = { proficiencyDescription: string; behaviouralImplications: string; watchOuts: string };
type Project = { title: string; whatToDo: string; howToDoIt: string; evidence: string };

type FrameworkRow = {
  domain: string;
  competency: string;
  definition: string;
  attributes: string[];
};

type ReportContentRow = {
  bands: Record<Band, BandContent>;
  strengthStatement: string | null;
  developmentNeedStatement: string | null;
  projects: Project[];
};

export type JobRoleImportResult = {
  jobRoleId: string;
  jobRoleName: string;
  domainCount: number;
  competencyCount: number;
  mappingCount: number;
  attributesCreated: string[];
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

function parseFrameworkSheet(sheet: XLSX.WorkSheet): FrameworkRow[] {
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
    const attributesRaw = cell(row, 4);
    out.push({
      domain,
      competency,
      definition,
      attributes: extractBullets(attributesRaw),
    });
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

export function parseJobRoleWorkbook(bytes: Uint8Array): {
  framework: FrameworkRow[];
  reportContent: ReportContentRow[];
  warnings: string[];
} {
  const workbook = XLSX.read(bytes, { type: "array" });
  const warnings: string[] = [];

  const frameworkSheetName = workbook.SheetNames.find((n) => /competency framework/i.test(n)) ?? workbook.SheetNames[0];
  const reportContentSheetName = workbook.SheetNames.find((n) => /report content/i.test(n)) ?? workbook.SheetNames[1];

  const framework = frameworkSheetName ? parseFrameworkSheet(workbook.Sheets[frameworkSheetName]) : [];
  const reportContent = reportContentSheetName ? parseReportContentSheet(workbook.Sheets[reportContentSheetName]) : [];

  if (framework.length === 0) {
    warnings.push("No Domain/Competency rows found on the framework sheet. Check the file matches the expected template.");
  }
  if (reportContent.length !== framework.length) {
    warnings.push(
      `Framework sheet has ${framework.length} competency rows but Report Content has ${reportContent.length}. Rows are matched by position — check row order matches on both sheets.`,
    );
  }

  return { framework, reportContent, warnings };
}

function normalizeAttrName(name: string): string {
  return name.toLowerCase().replace(/[-\s]/g, "");
}

function codeFromName(name: string, taken: Set<string>): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 10) || "ATTR";
  let code = base;
  let n = 2;
  while (taken.has(code)) {
    code = `${base}${n}`;
    n += 1;
  }
  taken.add(code);
  return code;
}

export async function importJobRoleFromWorkbook(args: {
  tenantId: string;
  jobRoleName: string;
  jobRoleSlug?: string | null;
  jobRoleDescription?: string | null;
  bytes: Uint8Array;
}): Promise<JobRoleImportResult> {
  const { tenantId, jobRoleName, bytes } = args;
  const { framework, reportContent, warnings } = parseJobRoleWorkbook(bytes);

  const jobRole = await prisma.jobRole.upsert({
    where: { tenantId_name: { tenantId, name: jobRoleName } },
    create: {
      tenantId,
      name: jobRoleName,
      slug: args.jobRoleSlug ?? null,
      description: args.jobRoleDescription ?? null,
    },
    update: {},
  });

  const existingAttributes = await prisma.attribute.findMany({ where: { tenantId } });
  const attrByNormalizedName = new Map(existingAttributes.map((a) => [normalizeAttrName(a.name), a]));
  const takenCodes = new Set(existingAttributes.map((a) => a.code));
  const attributesCreated: string[] = [];

  const domainNames = [...new Set(framework.map((r) => r.domain))];
  const domainByName = new Map<string, { id: string }>();
  for (const [i, name] of domainNames.entries()) {
    const domain = await prisma.domain.upsert({
      where: { jobRoleId_name: { jobRoleId: jobRole.id, name } },
      create: { tenantId, jobRoleId: jobRole.id, name, displayOrder: i },
      update: { displayOrder: i },
    });
    domainByName.set(name, domain);
  }

  let mappingCount = 0;

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

    for (const attrName of row.attributes) {
      const normalized = normalizeAttrName(attrName);
      let attr = attrByNormalizedName.get(normalized);
      if (!attr) {
        const code = codeFromName(attrName, takenCodes);
        attr = await prisma.attribute.create({ data: { tenantId, code, name: attrName } });
        attrByNormalizedName.set(normalized, attr);
        attributesCreated.push(attrName);
      }
      await prisma.attributeCompetencyMap.upsert({
        where: { attributeId_competencyId: { attributeId: attr.id, competencyId: competency.id } },
        create: { attributeId: attr.id, competencyId: competency.id, weight: 1.0 },
        update: { weight: 1.0 },
      });
      mappingCount += 1;
    }

    const rc = reportContent[i];
    if (!rc) {
      warnings.push(`No matching Report Content row for "${row.competency}" (position ${i + 1}) — band content/statements/projects not set.`);
      continue;
    }

    await prisma.competency.update({
      where: { id: competency.id },
      data: {
        strengthStatement: rc.strengthStatement,
        developmentNeedStatement: rc.developmentNeedStatement,
      },
    });

    for (const band of BANDS) {
      const content = rc.bands[band];
      await prisma.competencyBandContent.upsert({
        where: { competencyId_band: { competencyId: competency.id, band } },
        create: { competencyId: competency.id, band, ...content },
        update: { ...content },
      });
    }

    await prisma.developmentProject.deleteMany({ where: { competencyId: competency.id } });
    for (const [pIdx, project] of rc.projects.entries()) {
      await prisma.developmentProject.create({
        data: { competencyId: competency.id, displayOrder: pIdx, ...project },
      });
    }
  }

  return {
    jobRoleId: jobRole.id,
    jobRoleName: jobRole.name,
    domainCount: domainNames.length,
    competencyCount: framework.length,
    mappingCount,
    attributesCreated,
    warnings,
  };
}
