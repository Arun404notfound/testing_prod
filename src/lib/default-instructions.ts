export type BlockKind = "legacy_mcq" | "item_mcq" | "item_mcq_multi" | "item_tf" | "likert" | "triad" | "sjt" | "case_study" | "open_ended";

export interface DefaultInstruction {
  key: string;
  heading: string;
  text: string;
  when?: (kinds: Set<BlockKind>) => boolean;
}

export const DEFAULT_INSTRUCTIONS: DefaultInstruction[] = [
  {
    key: "timer",
    heading: "Timer",
    text: 'The timer starts the moment you click "Start Assessment" and cannot be paused or extended. Ensure you are in a distraction-free environment before you begin.',
  },
  {
    key: "one-way-nav",
    heading: "One-way navigation",
    text: "Questions are presented one at a time in a fixed order. You cannot go back to a previous question. Moving forward without an answer records it as Skipped.",
  },
  {
    key: "likert-howto",
    heading: "How to answer Likert Scale questions",
    text: "You'll see one statement with a 5-point scale from Not like me to Just like me. Select the single option that best reflects how much the statement describes you.",
    when: (kinds) => kinds.has("likert"),
  },
  {
    key: "triad-howto",
    heading: "How to answer Forced Choice questions",
    text: "You'll see three statements labelled A, B and C. Choose exactly one that is Most like you and exactly one that is Least like you — the remaining statement is left unmarked. You cannot select the same statement for both.",
    when: (kinds) => kinds.has("triad"),
  },
  {
    key: "mcq-howto",
    heading: "How to answer Multiple Choice questions",
    text: "You'll see one question with four options. Select the single option you believe is correct.",
    when: (kinds) => kinds.has("item_mcq") || kinds.has("item_tf") || kinds.has("legacy_mcq"),
  },
  {
    key: "mcq-multi-howto",
    heading: "How to answer Multiple Choice (multi-select) questions",
    text: "You'll see one question with several options where more than one may be correct. Select every option you believe is correct — you can select or unselect as many as apply.",
    when: (kinds) => kinds.has("item_mcq_multi"),
  },
  {
    key: "open-ended-howto",
    heading: "How to answer Open-Ended questions",
    text: "You'll see a question with a free-text box. Type your answer in your own words — there's no character limit, and your response is reviewed manually rather than auto-scored.",
    when: (kinds) => kinds.has("open_ended"),
  },
  {
    key: "sjt-howto",
    heading: "How to answer Situational Judgment questions",
    text: "You'll see a short workplace scenario followed by several possible responses. Select the option you believe is the most effective response to the situation.",
    when: (kinds) => kinds.has("sjt"),
  },
  {
    key: "case-study-howto",
    heading: "How to answer Case Study questions",
    text: "You'll see a passage followed by several related questions. Read the passage carefully, then answer each question based on it. The passage stays visible while you answer.",
    when: (kinds) => kinds.has("case_study"),
  },
  {
    key: "honesty",
    heading: "Answer honestly",
    text: "For personality and behavioural questions there are no right or wrong answers. Respond based on how you truly think and act, not what you think the assessor wants to hear.",
    when: (kinds) => kinds.has("likert") || kinds.has("triad"),
  },
  {
    key: "stay-on-page",
    heading: "Stay on the page",
    text: "Do not refresh, press back, or close the browser tab during the test. Doing so may result in loss of progress. Tab switching may be flagged and recorded.",
  },
  {
    key: "single-attempt",
    heading: "Single attempt",
    text: "Once you submit, your responses are final and cannot be revised. This assessment can only be attempted once per assignment.",
  },
];
