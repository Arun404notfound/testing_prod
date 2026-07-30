export type TemplateType = "CANDIDATES" | "MCQ_QUESTIONS" | "LIKERT_ITEMS" | "TRIAD_ITEMS";

type TemplateConfig = {
  fileName: string;
  columns: string[];
  rows: string[][];
};

const templates: Record<TemplateType, TemplateConfig> = {
  CANDIDATES: {
    fileName: "candidates-template.csv",
    columns: [
      "fullName",
      "email",
      "mobile",
      "employeeId",
      "designation",
      "department",
      "location",
    ],
    rows: [
      ["Priya Sharma", "priya.sharma@example.com", "+91 9876543210", "EMP-1001", "Sales Executive", "Sales", "Bengaluru"],
      ["Alex Chen", "alex.chen@example.com", "+1 4155550199", "EMP-1002", "Territory Sales Executive", "Sales", "San Francisco"],
    ],
  },
  MCQ_QUESTIONS: {
    fileName: "mcq-questions-template.csv",
    columns: [
      "section",
      "category",
      "questionText",
      "option1",
      "option2",
      "option3",
      "option4",
      "correctOption",
      "explanation",
      "attribute",
    ],
    rows: [
      [
        "CenturyPly Product Knowledge",
        "Product Knowledge",
        "Which product is best for humid kitchen cabinets?",
        "Sainik 710",
        "Club Prime with ViroKill & Firewall",
        "Regular commercial grade",
        "Particle board alternative",
        "2",
        "Club Prime is preferred due to feature set and durability.",
        "Competence",
      ],
      [
        "SE Selling Skills",
        "Objection Handling",
        "How should price objections be handled for premium products?",
        "Offer immediate discount",
        "Explain long-term value and lifecycle cost",
        "Ignore objection",
        "Change topic",
        "2",
        "Value-based framing improves conversion quality.",
        "",
      ],
    ],
  },
  LIKERT_ITEMS: {
    fileName: "likert-items-template.csv",
    columns: ["factor", "attribute", "definition", "polarity", "questionText", "section", "category"],
    rows: [
      [
        "Emotional Stability",
        "Composure",
        "Maintains calm under pressure.",
        "POSITIVE",
        "I remain calm when customers strongly disagree with me.",
        "Sales Work Style",
        "Behavioral",
      ],
      [
        "Sales Drive",
        "Persistence",
        "Continues follow-up when responses are delayed.",
        "NEGATIVE",
        "I avoid following up if prospects do not respond quickly.",
        "Sales Work Style",
        "Behavioral",
      ],
    ],
  },
  TRIAD_ITEMS: {
    fileName: "triad-items-template.csv",
    columns: [
      "triadGroupCode",
      "statementNumber",
      "factor",
      "attribute",
      "definition",
      "polarity",
      "statementText",
    ],
    rows: [
      [
        "TRIAD-DEMO-1",
        "1",
        "Consultative Selling",
        "Needs Discovery",
        "Understands requirements before proposing a solution.",
        "POSITIVE",
        "I ask probing questions before recommending a product.",
      ],
      [
        "TRIAD-DEMO-1",
        "2",
        "Customer Orientation",
        "Decision Pressure",
        "Uses pressure instead of resolving concerns.",
        "NEGATIVE",
        "I prefer to close quickly even if some doubts remain.",
      ],
      [
        "TRIAD-DEMO-1",
        "3",
        "Sales Drive",
        "Value Selling",
        "Frames premium pricing through long-term customer value.",
        "POSITIVE",
        "I explain the long-term value of premium products.",
      ],
      [
        "TRIAD-DEMO-2",
        "1",
        "Execution Discipline",
        "Preparation",
        "Uses facts and planning before important conversations.",
        "POSITIVE",
        "I prepare evidence before discussing objections.",
      ],
      [
        "TRIAD-DEMO-2",
        "2",
        "Sales Drive",
        "Persistence",
        "Sustains progress through commercial friction.",
        "NEGATIVE",
        "I drop difficult dealer conversations when they become uncomfortable.",
      ],
      [
        "TRIAD-DEMO-2",
        "3",
        "Market Orientation",
        "Channel Insight",
        "Connects channel action to market context.",
        "POSITIVE",
        "I align dealer priorities with customer demand signals.",
      ],
    ],
  },
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function buildTemplateCsv(type: TemplateType) {
  const config = templates[type];
  const lines = [
    config.columns.map(escapeCsv).join(","),
    ...config.rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  return {
    fileName: config.fileName,
    csv: `${lines.join("\n")}\n`,
    columns: config.columns,
  };
}

export function getTemplateColumns() {
  return {
    candidates: templates.CANDIDATES.columns,
    mcq: templates.MCQ_QUESTIONS.columns,
    likert: templates.LIKERT_ITEMS.columns,
    triad: templates.TRIAD_ITEMS.columns,
  };
}
