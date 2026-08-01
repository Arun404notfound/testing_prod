import * as XLSX from "xlsx";
import type { SubmissionsData } from "@/lib/get-submissions";

const LIKERT_LABELS: Record<number, string> = {
  1: "Not like me",
  2: "Less like me",
  3: "Somewhat like me",
  4: "Almost like me",
  5: "Just like me",
};

const NOT_APPLICABLE = "Not applicable";

type McqRow = {
  "No.": number;
  Question: string;
  "Selected Option": string;
  "Correct Option": string;
  Result: string;
};

type LikertRow = {
  "No.": number;
  Statement: string;
  Attribute: string;
  Sentiment: string;
  Rating: number | "";
  "Rating Label": string;
  "Scored Value": number | "";
};

type TriadRow = {
  "No.": number;
  Situation: string;
  "Most Statement": string;
  "Most Attribute": string;
  "Most Sentiment": string;
  "Least Statement": string;
  "Least Attribute": string;
  "Least Sentiment": string;
};

function sentimentLabel(polarity: string | null | undefined) {
  if (polarity === "POSITIVE") return "Positive";
  if (polarity === "NEGATIVE") return "Negative";
  return "";
}

function safePart(value: string | null | undefined, fallback: string) {
  const cleaned = (value ?? "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export function responseExportFileName(data: SubmissionsData) {
  const nameParts = data.result.candidate.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = safePart(nameParts[0], "Employee");
  const lastName = safePart(nameParts.length > 1 ? nameParts[nameParts.length - 1] : "", "Employee");
  const testName = safePart(data.result.assessment?.title ?? data.result.assessmentName, "Assessment");
  const employeeId = safePart(data.result.candidate.employeeId, "NoEMPId");
  return `${firstName}_${lastName}_${testName}_${employeeId}.xlsx`;
}

function buildMcqRows(data: SubmissionsData): McqRow[] {
  const { result } = data;
  const assessment = result.assessment;
  const rows: McqRow[] = [];
  let n = 1;

  const mcqResponseByQuestion = new Map(result.questionResponses.map((response) => [response.questionId, response]));
  const mcqQuestions = assessment?.questions.length
    ? assessment.questions.map(({ question }) => question)
    : result.questionResponses.map((response) => ({ id: response.questionId, ...response.question }));

  for (const question of mcqQuestions) {
    const response = mcqResponseByQuestion.get(question.id);
    const options = [question.option1, question.option2, question.option3, question.option4];
    const selected = response?.selectedOption
      ? `${String.fromCharCode(64 + response.selectedOption)}. ${options[response.selectedOption - 1]}`
      : "";
    const correct = `${String.fromCharCode(64 + question.correctOption)}. ${options[question.correctOption - 1] ?? ""}`;
    rows.push({
      "No.": n++,
      Question: question.questionText,
      "Selected Option": selected || "Skipped",
      "Correct Option": correct,
      Result: response ? (response.isCorrect ? "Correct" : "Incorrect") : "Skipped",
    });
  }

  return rows;
}

function buildLikertRows(data: SubmissionsData): LikertRow[] {
  const { result, attempt } = data;
  const assessment = result.assessment;
  const rows: LikertRow[] = [];
  let n = 1;

  const attemptResponses = attempt?.responses ?? [];
  const likertResponses = new Map(
    attemptResponses.filter((response) => response.item?.itemType === "LIKERT" && response.itemId).map((response) => [response.itemId!, response]),
  );
  const likertItems = new Map<string, { id: string; prompt: string; factor: string | null; trait: string | null; polarity: string | null }>();
  for (const item of assessment?.items ?? []) {
    if (item.itemType === "LIKERT") likertItems.set(item.id, item);
  }
  for (const composition of assessment?.compositionItems ?? []) {
    const item = composition.sourceItem;
    if (item?.itemType === "LIKERT" && !likertItems.has(item.id)) likertItems.set(item.id, item);
  }
  if (likertItems.size === 0) {
    for (const response of likertResponses.values()) {
      if (response.item) likertItems.set(response.item.id, response.item);
    }
  }

  for (const item of likertItems.values()) {
    const response = likertResponses.get(item.id);
    const rating = response?.numericValue ?? null;
    rows.push({
      "No.": n++,
      Statement: item.prompt,
      Attribute: item.trait ?? item.factor ?? NOT_APPLICABLE,
      Sentiment: sentimentLabel(item.polarity),
      Rating: rating ?? "",
      "Rating Label": rating === null ? "Skipped" : LIKERT_LABELS[rating] ?? "",
      "Scored Value": response?.scoredValue ?? "",
    });
  }

  return rows;
}

function buildTriadRows(data: SubmissionsData): TriadRow[] {
  const { result, attempt } = data;
  const assessment = result.assessment;
  const rows: TriadRow[] = [];
  let n = 1;

  const attemptResponses = attempt?.responses ?? [];
  const triadResponses = new Map(
    attemptResponses.filter((response) => response.triadGroupId).map((response) => [response.triadGroupId!, response]),
  );
  type TriadGroupRow = { id: string; title: string };
  const triadGroups = new Map<string, TriadGroupRow>();
  for (const group of assessment?.triadGroups ?? []) triadGroups.set(group.id, group);
  for (const composition of assessment?.compositionItems ?? []) {
    const group = composition.sourceTriad;
    if (group && !triadGroups.has(group.id)) triadGroups.set(group.id, group);
  }
  if (triadGroups.size === 0) {
    for (const response of triadResponses.values()) {
      if (response.triadGroup) triadGroups.set(response.triadGroup.id, response.triadGroup);
    }
  }

  for (const group of triadGroups.values()) {
    const response = triadResponses.get(group.id);
    const mostTrait = response?.triadMostStatement?.trait ?? null;
    const leastTrait = response?.triadLeastStatement?.trait ?? null;
    rows.push({
      "No.": n++,
      Situation: group.title,
      "Most Statement": response?.triadMostStatement?.statementText ?? "",
      "Most Attribute": mostTrait ?? (response ? "" : "Skipped"),
      "Most Sentiment": sentimentLabel(response?.triadMostStatement?.polarity),
      "Least Statement": response?.triadLeastStatement?.statementText ?? "",
      "Least Attribute": leastTrait ?? (response ? "" : "Skipped"),
      "Least Sentiment": sentimentLabel(response?.triadLeastStatement?.polarity),
    });
  }

  return rows;
}

export function buildResponseWorkbook(data: SubmissionsData) {
  const { result } = data;
  const assessmentName = result.assessment?.title ?? result.assessmentName;

  const mcqRows = buildMcqRows(data);
  const likertRows = buildLikertRows(data);
  const triadRows = buildTriadRows(data);

  const totalQuestions = mcqRows.length + likertRows.length + triadRows.length;
  const skipped =
    mcqRows.filter((r) => r.Result === "Skipped").length +
    likertRows.filter((r) => r.Rating === "").length +
    triadRows.filter((r) => r["Most Statement"] === "").length;

  const summaryRows = [
    ["Employee Response Export", ""],
    ["Employee Name", result.candidate.fullName],
    ["Employee ID", result.candidate.employeeId ?? ""],
    ["Email", result.candidate.email],
    ["Designation", result.candidate.designation ?? ""],
    ["Batch", result.candidate.batchName ?? ""],
    ["Assessment", assessmentName],
    ["Assessment Type", result.assessment?.assessmentType ?? ""],
    ["Job Role", result.assessment?.jobRole?.name ?? NOT_APPLICABLE],
    ["Completed On", new Date(result.completedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
    ["Overall Score", result.overallScore],
    ["Questions", totalQuestions],
    ["Answered", totalQuestions - skipped],
    ["Skipped", skipped],
  ];

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  if (mcqRows.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(mcqRows);
    sheet["!cols"] = [{ wch: 6 }, { wch: 60 }, { wch: 40 }, { wch: 40 }, { wch: 12 }];
    if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
    XLSX.utils.book_append_sheet(workbook, sheet, "MCQ Responses");
  }

  if (likertRows.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(likertRows);
    sheet["!cols"] = [{ wch: 6 }, { wch: 60 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }];
    if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
    XLSX.utils.book_append_sheet(workbook, sheet, "Likert Responses");
  }

  if (triadRows.length > 0) {
    const sheet = XLSX.utils.json_to_sheet(triadRows);
    sheet["!cols"] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 45 },
      { wch: 18 },
      { wch: 12 },
      { wch: 45 },
      { wch: 18 },
      { wch: 12 },
    ];
    if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
    XLSX.utils.book_append_sheet(workbook, sheet, "Forced-Choice Responses");
  }

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer", compression: true });
}
