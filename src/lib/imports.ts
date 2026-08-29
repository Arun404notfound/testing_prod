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
  // CSV has no built-in encoding declaration, so handing the raw bytes to
  // XLSX.read({type:"array"}) leaves it to guess a codepage — it doesn't
  // guess UTF-8, so any non-ASCII character (em dashes, curly quotes,
  // accented names, ₹, …) comes out mangled. Decoding as UTF-8 ourselves
  // first and reading as a string sidesteps the guess entirely. Real .xlsx
  // files are a binary zip format, not decodable as text, so those still go
  // through the byte-array reader (SheetJS parses their internal XML UTF-8
  // correctly on its own — the bug is specific to plain CSV).
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const workbook = isCsv
    ? XLSX.read(new TextDecoder("utf-8").decode(bytes), { type: "string" })
    : XLSX.read(bytes, { type: "array" });
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

/** Bulk-import media is a URL to an already-hosted file, not an embedded/uploaded
 *  file — spreadsheets have no reliable way to carry binary attachments per row.
 *  Empty is always fine (media is optional everywhere); a non-empty value must at
 *  least look like a link, to catch pasted file paths or stray text early. */
function isValidMediaUrl(value: string): boolean {
  if (!value) return true;
  return /^https?:\/\//i.test(value);
}

/** Reads the shared `imageUrl1`/`imageUrl2`/`imageUrl3` columns, dropping blanks — same
 *  "up to 3, all optional" shape as the interactive forms' `QuestionImagesField`. */
function collectImageUrls(row: ParsedRow): string[] {
  return [row.imageurl1, row.imageurl2, row.imageurl3].filter((v): v is string => Boolean(v));
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

  // Scale columns are optional — blank means "use the same shared 1-5 scale
  // every previous version of this import used", so old sheets keep behaving
  // identically. A file can mix rows with and without custom scale columns,
  // so this resolves (and upserts) per row rather than once up front, caching
  // by scale identity so a file with many rows on the same custom scale only
  // upserts it once.
  const likertScaleCache = new Map<string, { id: string }>();
  async function resolveLikertScale(row: ParsedRow) {
    const hasCustomScale = Boolean(row.scaleminvalue || row.scalemaxvalue || row.scaleminlabel || row.scalemaxlabel);
    const minValue = hasCustomScale ? parseInt(row.scaleminvalue || "1", 10) : 1;
    const maxValue = hasCustomScale ? parseInt(row.scalemaxvalue || "5", 10) : 5;
    const minLabel = hasCustomScale ? (row.scaleminlabel || "Strongly disagree") : "Strongly disagree";
    const maxLabel = hasCustomScale ? (row.scalemaxlabel || "Strongly agree") : "Strongly agree";
    if (!Number.isInteger(minValue) || !Number.isInteger(maxValue) || maxValue <= minValue) {
      throw new Error("scaleMinValue/scaleMaxValue must be whole numbers with scaleMaxValue greater than scaleMinValue");
    }
    const name = hasCustomScale ? `Bulk Import ${minValue}-${maxValue}` : "Agreement 1-5";
    const cacheKey = `${name}|${minValue}|${maxValue}`;
    const cached = likertScaleCache.get(cacheKey);
    if (cached) return cached;
    const scale = await prisma.likertScale.upsert({
      where: { name_minValue_maxValue: { name, minValue, maxValue } },
      update: hasCustomScale ? { minLabel, maxLabel } : {},
      create: { name, minValue, maxValue, minLabel, maxLabel },
    });
    likertScaleCache.set(cacheKey, scale);
    return scale;
  }

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

        const imageUrls = collectImageUrls(row);
        if ([...imageUrls, row.audiourl].some((v) => v && !isValidMediaUrl(v))) {
          throw new Error("imageUrl1/2/3 and audioUrl must be full http(s) links, or left blank");
        }

        const likertScale = await resolveLikertScale(row);

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
            audioUrl: row.audiourl || null,
            images: imageUrls.length > 0 ? { create: imageUrls.map((url, i) => ({ url, displayOrder: i })) } : undefined,
          },
        });
      } else if (args.importType === "SJT_ITEMS") {
        const required = [
          "prompt",
          "attribute",
          "option1score",
          "option2score",
          "option3score",
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

        const imageUrls = collectImageUrls(row);
        const opts = [1, 2, 3, 4].map((n) => ({
          label: row[`option${n}`],
          scoreValue: Number(row[`option${n}score`]),
          imageUrl: row[`option${n}imageurl`] || null,
        }));
        // A response counts even with no text label as long as it has an image.
        const missingResponse = opts.find((o) => !o.label && !o.imageUrl);
        if (missingResponse) {
          throw new Error("Each option needs response text, an option image URL, or both");
        }
        const badScore = opts.find((o) => !Number.isFinite(o.scoreValue));
        if (badScore) {
          throw new Error(`Option scores must be numbers (got "${badScore.scoreValue}")`);
        }
        const badUrl = [...imageUrls, row.audiourl, ...opts.map((o) => o.imageUrl)].find((v) => v && !isValidMediaUrl(v));
        if (badUrl) {
          throw new Error("imageUrl1/2/3, audioUrl, and option image URLs must be full http(s) links, or left blank");
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
            audioUrl: row.audiourl || null,
            images: imageUrls.length > 0 ? { create: imageUrls.map((url, i) => ({ url, displayOrder: i })) } : undefined,
            options: {
              create: opts.map((o, i) => ({
                label: o.label,
                value: o.label || `Option ${i + 1}`,
                displayOrder: i,
                isCorrect: o.scoreValue === bestScore,
                scoreValue: o.scoreValue,
                imageUrl: o.imageUrl,
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

type CaseStudyGroupEntry = { rowNumber: number; row: ParsedRow };
type SubQuestionType = "MCQ" | "LIKERT" | "TRIAD";

/** Always required, regardless of subQuestionType. */
const CASE_STUDY_BASE_ROW_KEYS = ["casestudycode", "title", "passagetext", "subquestionnumber", "questiontext"] as const;

function validateCaseStudyBaseRow(entry: CaseStudyGroupEntry): string | null {
  const { rowNumber, row } = entry;
  const missing = CASE_STUDY_BASE_ROW_KEYS.filter((key) => !String(row[key] ?? "").trim());
  if (missing.length > 0) {
    return `Row ${rowNumber}: Missing required fields: ${missing.join(", ")}`;
  }
  const subNum = Number(String(row.subquestionnumber).trim());
  if (!Number.isInteger(subNum) || subNum < 1) {
    return `Row ${rowNumber}: subQuestionNumber must be a positive integer`;
  }
  return null;
}

/** All rows sharing one (caseStudyCode, subQuestionNumber) must declare the same
 *  subQuestionType (or leave it blank, which defaults to MCQ) — this is what lets
 *  a Triad sub-question span 3 rows while MCQ/Likert stay 1 row each. */
function resolveSubQuestionType(entries: CaseStudyGroupEntry[]): SubQuestionType | null {
  const declared = new Set(
    entries.map((e) => e.row.subquestiontype?.trim().toUpperCase()).filter((v): v is string => Boolean(v)),
  );
  if (declared.size > 1) return null;
  const type = [...declared][0] ?? "MCQ";
  return type === "MCQ" || type === "LIKERT" || type === "TRIAD" ? type : null;
}

function validateMcqSubQuestion(entry: CaseStudyGroupEntry): string | null {
  const { rowNumber, row } = entry;
  if (!row.attribute?.trim()) return `Row ${rowNumber}: attribute is required for an MCQ sub-question`;
  const correctOption = Number(String(row.correctoption ?? "").trim());
  if (![1, 2, 3, 4].includes(correctOption)) return `Row ${rowNumber}: correctOption must be 1, 2, 3, or 4`;
  // An option counts even with no text label as long as it has an image.
  const missingOption = [1, 2, 3, 4].find((n) => !row[`option${n}`]?.trim() && !row[`option${n}imageurl`]?.trim());
  if (missingOption) return `Row ${rowNumber}: option${missingOption} needs text, an option image URL, or both`;
  const badUrl = [...collectImageUrls(row), row.audiourl, ...[1, 2, 3, 4].map((n) => row[`option${n}imageurl`])].find(
    (v) => v && !isValidMediaUrl(v),
  );
  if (badUrl) return `Row ${rowNumber}: image/audio columns must be full http(s) links, or left blank`;
  return null;
}

function validateLikertSubQuestion(entry: CaseStudyGroupEntry): string | null {
  const { rowNumber, row } = entry;
  if (!row.attribute?.trim()) return `Row ${rowNumber}: attribute is required for a Likert sub-question`;
  const hasCustomScale = Boolean(row.scaleminvalue || row.scalemaxvalue || row.scaleminlabel || row.scalemaxlabel);
  if (hasCustomScale) {
    const min = parseInt(row.scaleminvalue || "1", 10);
    const max = parseInt(row.scalemaxvalue || "5", 10);
    if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
      return `Row ${rowNumber}: scaleMinValue/scaleMaxValue must be whole numbers with scaleMaxValue greater than scaleMinValue`;
    }
  }
  const badUrl = [...collectImageUrls(row), row.audiourl].find((v) => v && !isValidMediaUrl(v));
  if (badUrl) return `Row ${rowNumber}: image/audio columns must be full http(s) links, or left blank`;
  return null;
}

function validateTriadSubQuestion(entries: CaseStudyGroupEntry[]): string | null {
  if (entries.length !== 3) {
    return `must contain exactly 3 rows for subQuestionType TRIAD (one per statementNumber), found ${entries.length}`;
  }
  for (const e of entries) {
    if (!e.row.statementtext?.trim() || !e.row.statementattribute?.trim()) {
      return `Row ${e.rowNumber}: statementText and statementAttribute are required for a Triad statement row`;
    }
    const polarity = e.row.statementpolarity?.trim().toUpperCase();
    if (polarity !== "POSITIVE" && polarity !== "NEGATIVE") {
      return `Row ${e.rowNumber}: statementPolarity must be POSITIVE or NEGATIVE`;
    }
  }
  const nums = entries.map((e) => Number(e.row.statementnumber));
  const uniq = new Set(nums);
  if (uniq.size !== 3 || ![1, 2, 3].every((n) => uniq.has(n))) {
    return "statementNumber must be 1, 2, and 3 (each exactly once) across the 3 rows for this sub-question";
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
 *
 * A sub-question is 1 row for MCQ/LIKERT, or 3 rows (sharing subQuestionNumber,
 * one per statementNumber) for TRIAD — mirrors the interactive Case Study
 * form's MCQ/Likert/Triad type selector (`case-study-form.tsx`) and its
 * server action (`createCaseStudy` in `psychometric/page.tsx`), including that
 * action's fix for mixing a scalar `attributeId` with a nested `likertScale`
 * relation (resolved as a separate upsert below, then passed as a scalar
 * `likertScaleId`, not `likertScale: { connectOrCreate }`).
 */
async function processCaseStudyImport(
  rows: ParsedRow[],
  tenantId: string,
): Promise<ImportResult> {
  const errors: ImportResult["errors"] = [];
  const caseStudyMap = new Map<string, CaseStudyGroupEntry[]>();

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];
    const code = String(row.casestudycode ?? "").trim();
    if (!code) {
      errors.push({ rowNumber, message: "caseStudyCode is required." });
      continue;
    }
    const list = caseStudyMap.get(code) ?? [];
    list.push({ rowNumber, row });
    caseStudyMap.set(code, list);
  }

  if (caseStudyMap.size === 0) {
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
  const likertScaleCache = new Map<string, { id: string }>();
  async function resolveLikertScale(row: ParsedRow) {
    const hasCustomScale = Boolean(row.scaleminvalue || row.scalemaxvalue || row.scaleminlabel || row.scalemaxlabel);
    const minValue = hasCustomScale ? parseInt(row.scaleminvalue || "1", 10) : 1;
    const maxValue = hasCustomScale ? parseInt(row.scalemaxvalue || "5", 10) : 5;
    const minLabel = hasCustomScale ? (row.scaleminlabel || "Strongly Disagree") : "Strongly Disagree";
    const maxLabel = hasCustomScale ? (row.scalemaxlabel || "Strongly Agree") : "Strongly Agree";
    const name = hasCustomScale ? `Bulk Import ${minValue}-${maxValue}` : "Case Study 1-5";
    const cacheKey = `${name}|${minValue}|${maxValue}`;
    const cached = likertScaleCache.get(cacheKey);
    if (cached) return cached;
    const scale = await prisma.likertScale.upsert({
      where: { name_minValue_maxValue: { name, minValue, maxValue } },
      update: hasCustomScale ? { minLabel, maxLabel } : {},
      create: { name, minValue, maxValue, minLabel, maxLabel },
    });
    likertScaleCache.set(cacheKey, scale);
    return scale;
  }

  const nextOrderAgg = await prisma.caseStudy.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  let nextDisplayOrder = (nextOrderAgg._max.displayOrder ?? 0) + 1;

  let successRows = 0;

  for (const [code, allEntries] of caseStudyMap) {
    const baseErrors: ImportResult["errors"] = [];
    for (const entry of allEntries) {
      const msg = validateCaseStudyBaseRow(entry);
      if (msg) baseErrors.push({ rowNumber: entry.rowNumber, message: msg });
    }
    if (baseErrors.length > 0) {
      errors.push(...baseErrors);
      continue;
    }

    // Group by subQuestionNumber — 1 row for MCQ/LIKERT, 3 rows (one per
    // statementNumber) for TRIAD.
    const subMap = new Map<number, CaseStudyGroupEntry[]>();
    for (const entry of allEntries) {
      const subNum = Number(entry.row.subquestionnumber);
      const list = subMap.get(subNum) ?? [];
      list.push(entry);
      subMap.set(subNum, list);
    }
    const subNumbers = [...subMap.keys()].sort((a, b) => a - b);
    const expected = Array.from({ length: subNumbers.length }, (_, i) => i + 1);
    if (!expected.every((n, i) => subNumbers[i] === n)) {
      for (const entry of allEntries) {
        errors.push({
          rowNumber: entry.rowNumber,
          message: `Group "${code}": subQuestionNumber must be 1..${subNumbers.length}, each present exactly once.`,
        });
      }
      continue;
    }

    type ResolvedSub = { subNum: number; type: SubQuestionType; entries: CaseStudyGroupEntry[] };
    const resolvedSubs: ResolvedSub[] = [];
    let groupHasError = false;

    for (const subNum of subNumbers) {
      const entries = subMap.get(subNum)!;
      const type = resolveSubQuestionType(entries);
      if (!type) {
        for (const entry of entries) {
          errors.push({ rowNumber: entry.rowNumber, message: `Row ${entry.rowNumber}: subQuestionType must be MCQ, LIKERT, or TRIAD (or left blank for MCQ)` });
        }
        groupHasError = true;
        continue;
      }
      if (type === "TRIAD") {
        const msg = validateTriadSubQuestion(entries);
        if (msg) {
          for (const entry of entries) errors.push({ rowNumber: entry.rowNumber, message: `Group "${code}", sub-question ${subNum}: ${msg}` });
          groupHasError = true;
          continue;
        }
      } else {
        if (entries.length !== 1) {
          for (const entry of entries) {
            errors.push({
              rowNumber: entry.rowNumber,
              message: `Group "${code}", sub-question ${subNum}: subQuestionType ${type} must have exactly 1 row (found ${entries.length}).`,
            });
          }
          groupHasError = true;
          continue;
        }
        const msg = type === "MCQ" ? validateMcqSubQuestion(entries[0]) : validateLikertSubQuestion(entries[0]);
        if (msg) {
          errors.push({ rowNumber: entries[0].rowNumber, message: msg });
          groupHasError = true;
          continue;
        }
      }
      resolvedSubs.push({ subNum, type, entries });
    }
    if (groupHasError) continue;

    const referencedAttrNames = new Set<string>();
    for (const sub of resolvedSubs) {
      if (sub.type === "TRIAD") {
        for (const e of sub.entries) referencedAttrNames.add(e.row.statementattribute.trim().toLowerCase());
      } else {
        referencedAttrNames.add(sub.entries[0].row.attribute.trim().toLowerCase());
      }
    }
    const missingAttrs = [...referencedAttrNames].filter((name) => !attrByName.has(name));
    if (missingAttrs.length > 0) {
      for (const entry of allEntries) {
        errors.push({ rowNumber: entry.rowNumber, message: `Group "${code}": unknown attribute "${missingAttrs.join(", ")}"` });
      }
      continue;
    }

    const first = allEntries[0].row;
    const mcqAndLikert = resolvedSubs.filter((s) => s.type !== "TRIAD");
    const triads = resolvedSubs.filter((s) => s.type === "TRIAD");
    // Shared displayOrder index across both source tables (AssessmentItem for
    // MCQ/Likert, TriadGroup for Triad) — same pattern the interactive form
    // uses, so sub-questions render back in file order regardless of type.
    const displayOrderBySubNum = new Map(resolvedSubs.map((s, i) => [s.subNum, i]));

    try {
      await prisma.$transaction(async (tx) => {
        const caseStudy = await tx.caseStudy.create({
          data: {
            tenantId,
            title: first.title.trim(),
            passageText: first.passagetext.trim(),
            displayOrder: nextDisplayOrder,
            subQuestions: {
              create: await Promise.all(
                mcqAndLikert.map(async (sub) => {
                  const row = sub.entries[0].row;
                  const attr = attrByName.get(row.attribute.trim().toLowerCase())!;
                  const imageUrls = collectImageUrls(row);
                  const images = imageUrls.length > 0 ? { create: imageUrls.map((url, ii) => ({ url, displayOrder: ii })) } : undefined;
                  const audioUrl = row.audiourl || null;
                  const displayOrder = displayOrderBySubNum.get(sub.subNum)!;

                  if (sub.type === "LIKERT") {
                    const scale = await resolveLikertScale(row);
                    return {
                      itemType: "LIKERT" as const,
                      prompt: row.questiontext.trim(),
                      displayOrder,
                      factor: attr.category || "General",
                      trait: attr.name,
                      definition: attr.name,
                      attributeId: attr.id,
                      likertScaleId: scale.id,
                      audioUrl,
                      images,
                    };
                  }
                  const options = [1, 2, 3, 4].map((n) => ({
                    label: row[`option${n}`]?.trim() ?? "",
                    imageUrl: row[`option${n}imageurl`] || null,
                  }));
                  const correctOption = Number(row.correctoption);
                  return {
                    itemType: "MCQ_SINGLE" as const,
                    prompt: row.questiontext.trim(),
                    displayOrder,
                    factor: attr.category || "General",
                    trait: attr.name,
                    definition: attr.name,
                    attributeId: attr.id,
                    audioUrl,
                    images,
                    options: {
                      create: options.map((o, oi) => ({
                        label: o.label,
                        value: o.label || `Option ${oi + 1}`,
                        displayOrder: oi,
                        isCorrect: oi + 1 === correctOption,
                        imageUrl: o.imageUrl,
                      })),
                    },
                  };
                }),
              ),
            },
          },
        });

        for (const sub of triads) {
          const sorted = sub.entries.slice().sort((a, b) => Number(a.row.statementnumber) - Number(b.row.statementnumber));
          await tx.triadGroup.create({
            data: {
              tenantId,
              caseStudyId: caseStudy.id,
              title: sorted[0].row.questiontext.trim(),
              displayOrder: displayOrderBySubNum.get(sub.subNum)!,
              statements: {
                create: sorted.map((entry, j) => {
                  const attr = attrByName.get(entry.row.statementattribute.trim().toLowerCase())!;
                  return {
                    statementText: entry.row.statementtext.trim(),
                    displayOrder: j,
                    factor: attr.category || "General",
                    trait: attr.name,
                    definition: attr.name,
                    polarity: entry.row.statementpolarity.trim().toUpperCase() as "POSITIVE" | "NEGATIVE",
                    attributeId: attr.id,
                  };
                }),
              },
            },
          });
        }
      });
      nextDisplayOrder += 1;
      successRows += allEntries.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create case study.";
      for (const entry of allEntries) {
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
