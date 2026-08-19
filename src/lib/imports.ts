import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { createCandidate } from "@/lib/candidate-user";

export type ImportKind = "CANDIDATES" | "MCQ_QUESTIONS" | "LIKERT_ITEMS" | "TRIAD_ITEMS" | "SJT_ITEMS" | "CASE_STUDY_ITEMS";

type ParsedRow = Record<string, string>;

type ImportResult = {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: Array<{ rowNumber: number; message: string }>;
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

function parseWorkbookRows(fileName: string, bytes: Uint8Array): ParsedRow[] {
  const workbook = XLSX.read(bytes, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows = rawRows.map((rawRow) => {
    const normalized: ParsedRow = {};
    for (const [key, value] of Object.entries(rawRow)) {
      normalized[normalizeKey(key)] = normalizeValue(value);
    }
    return normalized;
  });

  if (!fileName.toLowerCase().endsWith(".csv") && !fileName.toLowerCase().endsWith(".xlsx")) {
    return [];
  }

  return rows;
}

function missingRequired(row: ParsedRow, required: string[]) {
  return required.filter((key) => !row[key]);
}

export async function processImportFile(args: {
  tenantId: string;
  importType: ImportKind;
  fileName: string;
  bytes: Uint8Array;
  batchName?: string | null;
}) {
  const rows = parseWorkbookRows(args.fileName, args.bytes);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      successRows: 0,
      failedRows: 1,
      errors: [{ rowNumber: 0, message: "File has no rows or unsupported format. Use .csv or .xlsx" }],
    } satisfies ImportResult;
  }

  if (args.importType === "TRIAD_ITEMS") {
    return processTriadImport(rows, args.tenantId);
  }
  if (args.importType === "CASE_STUDY_ITEMS") {
    return processCaseStudyImport(rows, args.tenantId);
  }

  const errors: ImportResult["errors"] = [];
  let successRows = 0;

  const likertScale = await prisma.likertScale.upsert({
    where: {
      name_minValue_maxValue: {
        name: "Agreement 1-5",
        minValue: 1,
        maxValue: 5,
      },
    },
    update: {},
    create: {
      name: "Agreement 1-5",
      minValue: 1,
      maxValue: 5,
      minLabel: "Strongly disagree",
      maxLabel: "Strongly agree",
    },
  });

  let likertAssessmentId: string | null = null;
  const likertSectionByTitle = new Map<string, string>();

  // Bank-level SJT items (sectionId: null), same placement as admin-created
  // ones — displayOrder just needs to keep incrementing past whatever's
  // already in the bank, so this is fetched once and bumped locally per row.
  let sjtNextDisplayOrder: number | null = null;

  let attributeIdByName: Map<string, string> | null = null;
  async function resolveAttributeId(name: string): Promise<string | null> {
    if (!name.trim()) return null;
    if (!attributeIdByName) {
      const attrs = await prisma.attribute.findMany({
        where: { tenantId: args.tenantId },
        select: { id: true, name: true },
      });
      attributeIdByName = new Map(attrs.map((a) => [a.name.toLowerCase(), a.id]));
    }
    return attributeIdByName.get(name.trim().toLowerCase()) ?? null;
  }

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];

    try {
      if (args.importType === "CANDIDATES") {
        const required = [
          "fullname",
          "email",
          "mobile",
          "employeeid",
          "designation",
          "department",
          "location",
        ];
        const missing = missingRequired(row, required);
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        const created = await createCandidate({
          tenantId: args.tenantId,
          fullName: row.fullname,
          email: row.email,
          mobile: row.mobile,
          employeeId: row.employeeid,
          designation: row.designation,
          department: row.department,
          location: row.location,
          batchName: args.batchName ?? null,
        });
        if (!created.ok) {
          throw new Error("Could not create candidate");
        }
      } else if (args.importType === "MCQ_QUESTIONS") {
        const required = [
          "section",
          "category",
          "questiontext",
          "option1",
          "option2",
          "option3",
          "option4",
          "correctoption",
          "explanation",
        ];
        const missing = missingRequired(row, required);
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        const correctOption = Number(row.correctoption);
        if (![1, 2, 3, 4].includes(correctOption)) {
          throw new Error("correctOption must be 1, 2, 3, or 4");
        }

        const attributeId = await resolveAttributeId(row.attribute ?? "");

        await prisma.question.create({
          data: {
            tenantId: args.tenantId,
            section: row.section,
            category: row.category,
            questionText: row.questiontext,
            option1: row.option1,
            option2: row.option2,
            option3: row.option3,
            option4: row.option4,
            correctOption,
            explanation: row.explanation,
            attributeId,
          },
        });
      } else if (args.importType === "LIKERT_ITEMS") {
        const required = [
          "factor",
          "attribute",
          "definition",
          "polarity",
          "questiontext",
          "section",
          "category",
        ];
        const missing = missingRequired(row, required);
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        const normalizedPolarity = row.polarity.toUpperCase();
        if (normalizedPolarity !== "POSITIVE" && normalizedPolarity !== "NEGATIVE") {
          throw new Error("polarity must be POSITIVE or NEGATIVE");
        }

        if (!likertAssessmentId) {
          const assessment = await prisma.assessment.create({
            data: {
              tenantId: args.tenantId,
              title: "Imported Likert Items",
              description: "Likert item bank imported from file.",
              assessmentType: "LIKERT_PSYCHOMETRIC",
              reportTemplateType: "PSYCHOMETRIC_TRAIT_REPORT",
              durationMinutes: 20,
            },
            select: { id: true },
          });
          likertAssessmentId = assessment.id;
        }

        let sectionId = likertSectionByTitle.get(row.section);
        if (!sectionId) {
          const nextOrder = likertSectionByTitle.size + 1;
          const section = await prisma.assessmentSection.create({
            data: {
              assessmentId: likertAssessmentId,
              title: row.section,
              description: row.category,
              displayOrder: nextOrder,
            },
            select: { id: true },
          });
          sectionId = section.id;
          likertSectionByTitle.set(row.section, sectionId);
        }

        const itemCount = await prisma.assessmentItem.count({
          where: { sectionId },
        });

        await prisma.assessmentItem.create({
          data: {
            assessmentId: likertAssessmentId,
            sectionId,
            itemType: "LIKERT",
            prompt: row.questiontext,
            displayOrder: itemCount + 1,
            factor: row.factor,
            trait: row.attribute,
            definition: row.definition,
            polarity: normalizedPolarity as "POSITIVE" | "NEGATIVE",
            likertScaleId: likertScale.id,
          },
        });
      } else if (args.importType === "SJT_ITEMS") {
        const required = [
          "prompt",
          "attribute",
          "option1",
          "option1score",
          "option2",
          "option2score",
          "option3",
          "option3score",
          "option4",
          "option4score",
        ];
        const missing = missingRequired(row, required);
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        const attributeId = await resolveAttributeId(row.attribute);
        if (!attributeId) {
          throw new Error(`Unknown attribute: "${row.attribute}"`);
        }
        const attribute = await prisma.attribute.findUnique({
          where: { id: attributeId },
          select: { name: true, category: true },
        });
        if (!attribute) {
          throw new Error(`Unknown attribute: "${row.attribute}"`);
        }

        const opts = [1, 2, 3, 4].map((n) => ({
          label: row[`option${n}`],
          scoreValue: Number(row[`option${n}score`]),
        }));
        const badScore = opts.find((o) => !Number.isFinite(o.scoreValue));
        if (badScore) {
          throw new Error(`Option scores must be numbers (got "${badScore.scoreValue}")`);
        }
        const bestScore = Math.max(...opts.map((o) => o.scoreValue));

        if (sjtNextDisplayOrder === null) {
          const agg = await prisma.assessmentItem.aggregate({
            where: { sectionId: null },
            _max: { displayOrder: true },
          });
          sjtNextDisplayOrder = (agg._max.displayOrder ?? 0) + 1;
        }

        await prisma.assessmentItem.create({
          data: {
            itemType: "SJT",
            prompt: row.prompt,
            factor: attribute.category || "General",
            trait: attribute.name,
            definition: attribute.name,
            attributeId,
            displayOrder: sjtNextDisplayOrder,
            options: {
              create: opts.map((o, i) => ({
                label: o.label,
                value: o.label,
                displayOrder: i,
                isCorrect: o.scoreValue === bestScore,
                scoreValue: o.scoreValue,
              })),
            },
          },
        });
        sjtNextDisplayOrder += 1;
      }

      successRows += 1;
    } catch (error) {
      errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  return {
    totalRows: rows.length,
    successRows,
    failedRows: rows.length - successRows,
    errors,
  } satisfies ImportResult;
}

const TRIAD_ROW_KEYS = [
  "triadgroupcode",
  "statementnumber",
  "factor",
  "attribute",
  "definition",
  "polarity",
  "statementtext",
] as const;

type TriadGroupEntry = { rowNumber: number; row: ParsedRow };

async function getOrCreateTriadImportBank(tenantId: string) {
  const existing = await prisma.assessment.findFirst({
    where: {
      tenantId,
      title: "Imported Triad Bank",
      assessmentType: "FORCED_CHOICE_TRIAD",
    },
    include: {
      sections: { orderBy: { displayOrder: "asc" }, take: 1 },
    },
  });

  if (existing?.sections[0]) {
    return { assessmentId: existing.id, sectionId: existing.sections[0].id };
  }

  const created = await prisma.assessment.create({
    data: {
      tenantId,
      title: "Imported Triad Bank",
      description: "Triad groups imported from CSV/XLSX. Link to assessments as needed.",
      assessmentType: "FORCED_CHOICE_TRIAD",
      reportTemplateType: "FORCED_CHOICE_REPORT",
      durationMinutes: 30,
      sections: {
        create: {
          title: "Imported Triads",
          description: "Imported triad statement groups",
          displayOrder: 1,
        },
      },
    },
    include: { sections: { orderBy: { displayOrder: "asc" } } },
  });

  const sectionId = created.sections[0]?.id;
  if (!sectionId) {
    throw new Error("Could not create triad import section.");
  }

  return { assessmentId: created.id, sectionId };
}

function validateTriadRow(entry: TriadGroupEntry): string | null {
  const { rowNumber, row } = entry;
  const missing = TRIAD_ROW_KEYS.filter((key) => !String(row[key] ?? "").trim());
  if (missing.length > 0) {
    return `Row ${rowNumber}: Missing required fields: ${missing.join(", ")}`;
  }

  const stmtRaw = String(row.statementnumber).trim();
  const stmtNum = Number(stmtRaw);
  if (!Number.isInteger(stmtNum) || stmtNum < 1 || stmtNum > 3) {
    return `Row ${rowNumber}: statementNumber must be 1, 2, or 3`;
  }

  const polarity = row.polarity.trim().toUpperCase();
  if (polarity !== "POSITIVE" && polarity !== "NEGATIVE") {
    return `Row ${rowNumber}: polarity must be POSITIVE or NEGATIVE`;
  }

  return null;
}

async function processTriadImport(
  rows: ParsedRow[],
  tenantId: string,
): Promise<ImportResult> {
  const errors: ImportResult["errors"] = [];
  const groupMap = new Map<string, TriadGroupEntry[]>();

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];
    const code = String(row.triadgroupcode ?? "").trim();
    if (!code) {
      errors.push({ rowNumber, message: "triadGroupCode is required." });
      continue;
    }
    const list = groupMap.get(code) ?? [];
    list.push({ rowNumber, row });
    groupMap.set(code, list);
  }

  if (groupMap.size === 0) {
    return {
      totalRows: rows.length,
      successRows: 0,
      failedRows: rows.length,
      errors: errors.length > 0 ? errors : [{ rowNumber: 0, message: "No valid triadGroupCode values found." }],
    } satisfies ImportResult;
  }

  const codes = [...groupMap.keys()];
  const existingDbCodes = new Set(
    (
      await prisma.triadGroup.findMany({
        where: { tenantId, triadGroupCode: { in: codes } },
        select: { triadGroupCode: true },
      })
    )
      .map((g) => g.triadGroupCode)
      .filter((c): c is string => Boolean(c)),
  );

  const { assessmentId, sectionId } = await getOrCreateTriadImportBank(tenantId);
  let successRows = 0;

  for (const code of codes) {
    const entries = groupMap.get(code)!;

    if (entries.length !== 3) {
      for (const entry of entries) {
        errors.push({
          rowNumber: entry.rowNumber,
          message: `Group "${code}": must contain exactly 3 rows (found ${entries.length}).`,
        });
      }
      continue;
    }

    const fieldErrors: ImportResult["errors"] = [];
    for (const entry of entries) {
      const msg = validateTriadRow(entry);
      if (msg) {
        fieldErrors.push({ rowNumber: entry.rowNumber, message: msg });
      }
    }
    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors);
      continue;
    }

    const statementNumbers = entries.map((e) => Number(e.row.statementnumber));
    const uniqueNums = new Set(statementNumbers);
    if (uniqueNums.size !== 3 || !statementNumbers.every((n) => n === 1 || n === 2 || n === 3)) {
      for (const entry of entries) {
        errors.push({
          rowNumber: entry.rowNumber,
          message: `Group "${code}": statementNumber must be 1, 2, and 3 (each exactly once within the group).`,
        });
      }
      continue;
    }

    if (existingDbCodes.has(code)) {
      for (const entry of entries) {
        errors.push({
          rowNumber: entry.rowNumber,
          message: `Group "${code}": triadGroupCode already exists for this tenant.`,
        });
      }
      continue;
    }

    const nextDisplayOrder =
      (await prisma.triadGroup.count({
        where: { sectionId },
      })) + 1;

    try {
      await prisma.triadGroup.create({
        data: {
          tenantId,
          triadGroupCode: code,
          assessmentId,
          sectionId,
          title: code,
          displayOrder: nextDisplayOrder,
          statements: {
            create: entries
              .slice()
              .sort(
                (a, b) =>
                  Number(a.row.statementnumber) - Number(b.row.statementnumber),
              )
              .map((entry) => ({
                statementText: entry.row.statementtext.trim(),
                displayOrder: Number(entry.row.statementnumber),
                factor: entry.row.factor.trim(),
                trait: entry.row.attribute.trim(),
                definition: entry.row.definition.trim(),
                polarity: entry.row.polarity.trim().toUpperCase() as "POSITIVE" | "NEGATIVE",
              })),
          },
        },
      });
      existingDbCodes.add(code);
      successRows += 3;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create triad group.";
      for (const entry of entries) {
        errors.push({ rowNumber: entry.rowNumber, message });
      }
    }
  }

  return {
    totalRows: rows.length,
    successRows,
    failedRows: rows.length - successRows,
    errors,
  } satisfies ImportResult;
}

const CASE_STUDY_ROW_KEYS = [
  "casestudycode",
  "title",
  "passagetext",
  "subquestionnumber",
  "attribute",
  "questiontext",
  "option1",
  "option2",
  "option3",
  "option4",
  "correctoption",
] as const;

type CaseStudyGroupEntry = { rowNumber: number; row: ParsedRow };

function validateCaseStudyRow(entry: CaseStudyGroupEntry): string | null {
  const { rowNumber, row } = entry;
  const missing = CASE_STUDY_ROW_KEYS.filter((key) => !String(row[key] ?? "").trim());
  if (missing.length > 0) {
    return `Row ${rowNumber}: Missing required fields: ${missing.join(", ")}`;
  }

  const subNum = Number(String(row.subquestionnumber).trim());
  if (!Number.isInteger(subNum) || subNum < 1) {
    return `Row ${rowNumber}: subQuestionNumber must be a positive integer`;
  }

  const correctOption = Number(String(row.correctoption).trim());
  if (![1, 2, 3, 4].includes(correctOption)) {
    return `Row ${rowNumber}: correctOption must be 1, 2, 3, or 4`;
  }

  return null;
}

/**
 * `caseStudyCode` only exists as an in-file grouping key here — unlike
 * TriadGroup, the CaseStudy model has no code column of its own (there's
 * nothing to de-duplicate against on a re-import), so it's read from the
 * sheet purely to know which rows belong to the same passage and is never
 * persisted. Sub-question count is whatever rows share a code (1 or more),
 * matching the admin form's variable "Add sub-question" count instead of a
 * fixed number.
 */
async function processCaseStudyImport(
  rows: ParsedRow[],
  tenantId: string,
): Promise<ImportResult> {
  const errors: ImportResult["errors"] = [];
  const groupMap = new Map<string, CaseStudyGroupEntry[]>();

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];
    const code = String(row.casestudycode ?? "").trim();
    if (!code) {
      errors.push({ rowNumber, message: "caseStudyCode is required." });
      continue;
    }
    const list = groupMap.get(code) ?? [];
    list.push({ rowNumber, row });
    groupMap.set(code, list);
  }

  if (groupMap.size === 0) {
    return {
      totalRows: rows.length,
      successRows: 0,
      failedRows: rows.length,
      errors: errors.length > 0 ? errors : [{ rowNumber: 0, message: "No valid caseStudyCode values found." }],
    } satisfies ImportResult;
  }

  const attrs = await prisma.attribute.findMany({
    where: { tenantId },
    select: { id: true, name: true, category: true },
  });
  const attrByName = new Map(attrs.map((a) => [a.name.toLowerCase(), a]));

  const nextOrderAgg = await prisma.caseStudy.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  let nextDisplayOrder = (nextOrderAgg._max.displayOrder ?? 0) + 1;

  let successRows = 0;

  for (const [code, entries] of groupMap) {
    const fieldErrors: ImportResult["errors"] = [];
    for (const entry of entries) {
      const msg = validateCaseStudyRow(entry);
      if (msg) fieldErrors.push({ rowNumber: entry.rowNumber, message: msg });
    }
    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors);
      continue;
    }

    const subNumbers = entries.map((e) => Number(e.row.subquestionnumber));
    const uniqueNums = new Set(subNumbers);
    const expected = Array.from({ length: entries.length }, (_, i) => i + 1);
    if (uniqueNums.size !== entries.length || !expected.every((n) => uniqueNums.has(n))) {
      for (const entry of entries) {
        errors.push({
          rowNumber: entry.rowNumber,
          message: `Group "${code}": subQuestionNumber must be 1..${entries.length}, each exactly once within the group.`,
        });
      }
      continue;
    }

    const missingAttrs = entries
      .map((e) => e.row.attribute.trim())
      .filter((name) => !attrByName.has(name.toLowerCase()));
    if (missingAttrs.length > 0) {
      for (const entry of entries) {
        errors.push({
          rowNumber: entry.rowNumber,
          message: `Group "${code}": unknown attribute "${entry.row.attribute}"`,
        });
      }
      continue;
    }

    const sorted = entries.slice().sort((a, b) => Number(a.row.subquestionnumber) - Number(b.row.subquestionnumber));
    const first = sorted[0].row;

    try {
      await prisma.caseStudy.create({
        data: {
          tenantId,
          title: first.title.trim(),
          passageText: first.passagetext.trim(),
          displayOrder: nextDisplayOrder,
          subQuestions: {
            create: sorted.map((entry, i) => {
              const attr = attrByName.get(entry.row.attribute.trim().toLowerCase())!;
              const options = [1, 2, 3, 4].map((n) => entry.row[`option${n}`].trim());
              const correctOption = Number(entry.row.correctoption);
              return {
                itemType: "MCQ_SINGLE" as const,
                prompt: entry.row.questiontext.trim(),
                displayOrder: i,
                factor: attr.category || "General",
                trait: attr.name,
                definition: attr.name,
                attributeId: attr.id,
                options: {
                  create: options.map((label, oi) => ({
                    label,
                    value: label,
                    displayOrder: oi,
                    isCorrect: oi + 1 === correctOption,
                  })),
                },
              };
            }),
          },
        },
      });
      nextDisplayOrder += 1;
      successRows += entries.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create case study.";
      for (const entry of entries) {
        errors.push({ rowNumber: entry.rowNumber, message });
      }
    }
  }

  return {
    totalRows: rows.length,
    successRows,
    failedRows: rows.length - successRows,
    errors,
  } satisfies ImportResult;
}
