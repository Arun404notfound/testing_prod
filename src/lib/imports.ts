import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { createCandidateWithLoginUser } from "@/lib/candidate-user";

export type ImportKind = "CANDIDATES" | "MCQ_QUESTIONS" | "LIKERT_ITEMS" | "TRIAD_ITEMS";

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

        const created = await createCandidateWithLoginUser({
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
          throw new Error(
            created.error === "email_in_use_non_candidate"
              ? "Email already used by a non-candidate account"
              : created.error === "email_linked_other_candidate"
                ? "Email already linked to another candidate"
                : "Could not create candidate login",
          );
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
