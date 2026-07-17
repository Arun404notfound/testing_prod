import * as XLSX from "xlsx";

/**
 * Downloadable Job Role Excel template — mirrors the exact two-sheet shape
 * `parseJobRoleWorkbook()` (src/lib/jobRoleImport.ts) reads, pre-filled with
 * instructional placeholder text in every cell (not real business content) so a
 * user can see exactly what belongs in each column before replacing it with
 * their own job role's framework.
 */

// Excel sheet names are capped at 31 characters — matches the real
// First-Time-Manager file's (truncated) sheet name exactly.
const FRAMEWORK_SHEET_NAME = "Competency framework and mappin";
const REPORT_CONTENT_SHEET_NAME = "Report Content";

const DOMAIN_SKELETON = [
  { name: "Domain 1 (e.g. Leading Self)", competencyCount: 3 },
  { name: "Domain 2 (e.g. Managing Work)", competencyCount: 3 },
  { name: "Domain 3 (e.g. Managing Performance)", competencyCount: 3 },
  { name: "Domain 4 (e.g. Building the Team)", competencyCount: 3 },
];

function flattenSkeleton(): Array<{ domain: string; competency: string }> {
  const rows: Array<{ domain: string; competency: string }> = [];
  DOMAIN_SKELETON.forEach((d, di) => {
    for (let ci = 1; ci <= d.competencyCount; ci++) {
      rows.push({ domain: d.name, competency: `Competency ${di + 1}.${ci}` });
    }
  });
  return rows;
}

function frameworkSheetRows(): unknown[][] {
  const header = ["Domain", "Competency", "Definition", "Key Behaviours", "Attribute Mapping"];
  const dataRows = flattenSkeleton().map(({ domain, competency }) => [
    domain,
    competency,
    "One or two sentence definition of what mastery of this competency looks like for someone in this job role.",
    "• Observable behaviour 1 for this competency.\n• Observable behaviour 2.\n• Observable behaviour 3.",
    "• Attribute name 1\n• Attribute name 2\n• Attribute name 3\n• Attribute name 4\n• Attribute name 5",
  ]);
  return [header, ...dataRows];
}

function bandPlaceholder(bandLabel: string): string {
  return [
    "Proficiency Description",
    `Placeholder narrative describing what this competency looks like at the "${bandLabel}" level for this role.`,
    "",
    "Behavioural Implications",
    "• Placeholder observable implication 1.",
    "• Placeholder observable implication 2.",
    "",
    "Watch-outs",
    "• Placeholder risk or watch-out 1.",
    "• Placeholder risk or watch-out 2.",
  ].join("\n");
}

function projectPlaceholder(n: number): string {
  return [
    `Project ${n} Title`,
    "",
    "What to do",
    "• Placeholder action 1.",
    "• Placeholder action 2.",
    "",
    "How to do it",
    "• Placeholder step 1.",
    "• Placeholder step 2.",
    "",
    "Evidence",
    "• Placeholder evidence of completion.",
  ].join("\n");
}

function reportContentSheetRows(): unknown[][] {
  const titleRow = [
    "Competency Report Content and Development Actions — TEMPLATE (replace every placeholder cell)",
  ];
  const subtitleRow = [
    "Four proficiency levels: Developing, Intermediate, Proficient and Expert. Keep this two-sheet structure — only replace the placeholder text.",
  ];
  const blankRow: unknown[] = [];
  const header = [
    "Domain",
    "Competency",
    "Developing (0-3.5)",
    "Intermediate (3.51-6.5)",
    "Proficient (6.51-8.5)",
    "Expert (8.5-10)",
    "Strength Statement (>6.5)",
    "Development-Need Statement (=<6.5)",
    "On-the-Job Project 1",
    "On-the-Job Project 2",
    "On-the-Job Project 3",
  ];
  const dataRows = flattenSkeleton().map(({ domain, competency }) => [
    domain,
    competency,
    bandPlaceholder("Developing"),
    bandPlaceholder("Intermediate"),
    bandPlaceholder("Proficient"),
    bandPlaceholder("Expert"),
    "Placeholder one-sentence strength statement, inserted into the report when the candidate scores above 6.5.",
    "Placeholder one-sentence development-need statement, inserted into the report when the candidate scores 6.5 or below.",
    projectPlaceholder(1),
    projectPlaceholder(2),
    projectPlaceholder(3),
  ]);
  return [titleRow, subtitleRow, blankRow, header, ...dataRows];
}

export function buildJobRoleTemplateWorkbook(): Buffer {
  const workbook = XLSX.utils.book_new();
  const frameworkSheet = XLSX.utils.aoa_to_sheet(frameworkSheetRows());
  const reportContentSheet = XLSX.utils.aoa_to_sheet(reportContentSheetRows());
  XLSX.utils.book_append_sheet(workbook, frameworkSheet, FRAMEWORK_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, reportContentSheet, REPORT_CONTENT_SHEET_NAME);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
