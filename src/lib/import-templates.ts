export type TemplateType = "CANDIDATES" | "MCQ_QUESTIONS" | "LIKERT_ITEMS" | "TRIAD_ITEMS" | "SJT_ITEMS" | "CASE_STUDY_ITEMS";

type TemplateConfig = {
  fileName: string;
  columns: string[];
  rows: string[][];
};

const templates: Record<TemplateType, TemplateConfig> = {
  SJT_ITEMS: {
    fileName: "sjt-items-template.csv",
    columns: [
      "prompt",
      "attribute",
      "imageUrl1",
      "imageUrl2",
      "imageUrl3",
      "audioUrl",
      "option1",
      "option1Score",
      "option1ImageUrl",
      "option2",
      "option2Score",
      "option2ImageUrl",
      "option3",
      "option3Score",
      "option3ImageUrl",
      "option4",
      "option4Score",
      "option4ImageUrl",
    ],
    rows: [
      [
        "A customer is visibly frustrated about a delayed delivery and raises their voice on the call. What do you do?",
        "Stress resilience",
        "", "", "", "",
        "Acknowledge the frustration, apologise, and give a clear updated timeline.",
        "3", "",
        "Explain the delay is due to logistics and it's out of your hands.",
        "1", "",
        "Ask them to calm down before continuing the conversation.",
        "0", "",
        "Escalate immediately without addressing their concern first.",
        "1", "",
      ],
      [
        "You notice a teammate is struggling to meet their weekly targets but hasn't asked for help. What's your best response? (image/audio columns are optional — leave blank if not needed)",
        "Sympathy",
        "https://example.com/media/sjt-team-chart.png", "", "", "https://example.com/media/sjt-scenario-audio.mp3",
        "Check in privately and offer to help however they need.",
        "3", "",
        "Wait for them to ask for help since it's not your responsibility.",
        "0", "",
        "Mention it to your manager so they can follow up.",
        "1", "",
        "", // text left blank — this option is carried entirely by its image
        "1", "https://example.com/media/sjt-option-graph.png",
      ],
    ],
  },
  CASE_STUDY_ITEMS: {
    fileName: "case-study-items-template.csv",
    columns: [
      "caseStudyCode",
      "title",
      "passageText",
      "subQuestionNumber",
      "subQuestionType",
      "attribute",
      "questionText",
      "imageUrl1",
      "imageUrl2",
      "imageUrl3",
      "audioUrl",
      "option1",
      "option1ImageUrl",
      "option2",
      "option2ImageUrl",
      "option3",
      "option3ImageUrl",
      "option4",
      "option4ImageUrl",
      "correctOption",
      "scaleMinValue",
      "scaleMaxValue",
      "scaleMinLabel",
      "scaleMaxLabel",
      "statementNumber",
      "statementText",
      "statementAttribute",
      "statementPolarity",
    ],
    rows: [
      // Sub-question 1: MCQ (subQuestionType may also be left blank — defaults to MCQ)
      [
        "CASE-DEMO-1", "The Delayed Product Launch",
        "Your team is two weeks from a major product launch when a critical vendor announces a shipping delay that will push delivery back by a month...",
        "1", "MCQ",
        "Competence", "What should be the first step in responding to this situation?",
        "", "", "", "",
        "Assess the actual impact on the launch timeline and dependent workstreams", "",
        "Immediately announce a delay to all stakeholders", "",
        "Ask the vendor to expedite shipping at any cost", "",
        "Wait to see if the vendor recovers the timeline on their own", "",
        "1",
        "", "", "", "",
        "", "", "", "",
      ],
      // Sub-question 2: MCQ with an image-only option (text left blank, carried by option4ImageUrl) and question-level media
      [
        "CASE-DEMO-1", "The Delayed Product Launch",
        "Your team is two weeks from a major product launch when a critical vendor announces a shipping delay that will push delivery back by a month...",
        "2", "MCQ",
        "Dutifulness", "How should this be communicated to leadership? See the attached impact chart.",
        "https://example.com/media/case-study-impact-chart.png", "", "", "https://example.com/media/case-study-briefing-audio.mp3",
        "With a clear impact assessment and at least two mitigation options", "",
        "As a minor issue that doesn't need escalation yet", "",
        "By assigning blame to the vendor without further detail", "",
        "", "https://example.com/media/case-study-option-graph.png",
        "1",
        "", "", "", "",
        "", "", "", "",
      ],
      // Sub-question 3: LIKERT — options/correctOption left blank, scale columns optional (blank = default 1-5 "Strongly Disagree"/"Strongly Agree")
      [
        "CASE-DEMO-1", "The Delayed Product Launch",
        "Your team is two weeks from a major product launch when a critical vendor announces a shipping delay that will push delivery back by a month...",
        "3", "LIKERT",
        "Emotional control", "I would remain calm presenting this delay to senior leadership.",
        "", "", "", "",
        "", "", "", "", "", "", "", "", "",
        "1", "5", "Strongly Disagree", "Strongly Agree",
        "", "", "", "",
      ],
      // Sub-question 4: TRIAD — one sub-question expressed as 3 rows sharing subQuestionNumber=4,
      // one per statementNumber (1-3). questionText is the shared prompt/title for the triad;
      // "attribute"/option/scale columns are unused for these rows.
      [
        "CASE-DEMO-1", "The Delayed Product Launch",
        "Your team is two weeks from a major product launch when a critical vendor announces a shipping delay that will push delivery back by a month...",
        "4", "TRIAD",
        "", "Rank these responses to the vendor's announcement",
        "", "", "", "",
        "", "", "", "", "", "", "", "", "",
        "", "", "", "",
        "1", "Take ownership and propose a recovery plan to leadership.", "Competence", "POSITIVE",
      ],
      [
        "CASE-DEMO-1", "The Delayed Product Launch",
        "Your team is two weeks from a major product launch when a critical vendor announces a shipping delay that will push delivery back by a month...",
        "4", "TRIAD",
        "", "Rank these responses to the vendor's announcement",
        "", "", "", "",
        "", "", "", "", "", "", "", "", "",
        "", "", "", "",
        "2", "Escalate to your manager and wait for instructions.", "Dutifulness", "POSITIVE",
      ],
      [
        "CASE-DEMO-1", "The Delayed Product Launch",
        "Your team is two weeks from a major product launch when a critical vendor announces a shipping delay that will push delivery back by a month...",
        "4", "TRIAD",
        "", "Rank these responses to the vendor's announcement",
        "", "", "", "",
        "", "", "", "", "", "", "", "", "",
        "", "", "", "",
        "3", "Downplay the delay until it becomes unavoidable.", "Straightforwardness", "NEGATIVE",
      ],
    ],
  },
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
    sjt: templates.SJT_ITEMS.columns,
    caseStudy: templates.CASE_STUDY_ITEMS.columns,
  };
}
