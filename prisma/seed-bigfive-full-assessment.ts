/**
 * Seeds the full 50-question Big Five assessment:
 *   - 30 Likert items  (1 per attribute, positive polarity)
 *   - 20 Forced-choice triads (each attribute appears exactly twice)
 *
 * Assessment type: HYBRID (Likert + Triad in one assessment)
 * Candidate: Alex Chen (alex.chen@example.com)
 *
 * Triad design — each of the 30 attributes appears in exactly 2 triads:
 *
 * Round 1 (T1–T10): one appearance per attribute, grouped by factor pairing
 *   T1:  E1, A1, C1    T2:  E2, A2, C2    T3:  E3, A3, C3
 *   T4:  E4, A4, C4    T5:  E5, A5, C5    T6:  E6, A6, C6
 *   T7:  O1, O4, ES1   T8:  O2, O5, ES2   T9:  O3, O6, ES3
 *   T10: ES4, ES5, ES6
 *
 * Round 2 (T11–T20): second appearance per attribute, cross-factor mixed
 *   T11: E1, O1, ES4   T12: E2, O2, ES5   T13: E3, O3, ES6
 *   T14: E4, O4, A1    T15: E5, O5, A2    T16: E6, O6, A3
 *   T17: C1, ES1, A4   T18: C2, ES2, A5   T19: C3, ES3, A6
 *   T20: C4, C5, C6
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

// ── Attribute definitions ─────────────────────────────────────────────────────

type AttrDef = { code: string; factor: string; trait: string; definition: string };

const ATTRIBUTES: AttrDef[] = [
  { code: "E1", factor: "Extraversion", trait: "Sociability",      definition: "The tendency to be highly active in any social situation, with a high need for interpersonal interaction and social involvement." },
  { code: "E2", factor: "Extraversion", trait: "Warmth",           definition: "The tendency to genuinely like other people and explicitly express positive emotions towards others." },
  { code: "E3", factor: "Extraversion", trait: "Assertiveness",    definition: "The tendency to influence and direct the actions of others, by initiation, persuasion, good negotiation skills, social ascendancy and diplomatic behavior." },
  { code: "E4", factor: "Extraversion", trait: "Energy level",     definition: "The tendency to be fast paced, vigorous and energetic, characterized by an involvement in multiple activities simultaneously." },
  { code: "E5", factor: "Extraversion", trait: "Risk taking",      definition: "A risk-taking tendency often reflected in entrepreneurship skills, high level of stimulation and exploratory behaviour with limited information available." },
  { code: "E6", factor: "Extraversion", trait: "Positive emotion", definition: "The tendency to experience positive feelings like happiness, enthusiasm, optimism and joy." },
  { code: "A1", factor: "Agreeableness", trait: "Trust",                definition: "The tendency to believe that most people are honest and trustworthy, and to believe in the principle of 'forgive and forget'." },
  { code: "A2", factor: "Agreeableness", trait: "Straightforwardness",  definition: "The tendency to be candid, frank, genuine, and non-manipulative." },
  { code: "A3", factor: "Agreeableness", trait: "Altruism",             definition: "The tendency to be concerned for the welfare of others, deriving self-fulfilment from it and to respond to others in a non-judgmental manner." },
  { code: "A4", factor: "Agreeableness", trait: "Compliance",           definition: "The tendency to wilfully compromise or deny one's own needs to get along with the authority and others." },
  { code: "A5", factor: "Agreeableness", trait: "Modesty",              definition: "A measure of tendency of self-efficacy and humbleness and to play down one's achievements, without hampering one's self-confidence and self-esteem." },
  { code: "A6", factor: "Agreeableness", trait: "Sympathy",             definition: "The tendency to express compassion and sensitivity towards others' feelings and to be emotionally supportive of others in need." },
  { code: "C1", factor: "Conscientiousness", trait: "Competence",            definition: "Level of confidence in his or her ability to accomplish tasks, with a sense of self-efficacy, a desire to do better than others." },
  { code: "C2", factor: "Conscientiousness", trait: "Orderliness",           definition: "The tendency to be well organized, thorough, meticulous and clear in one's approach to work." },
  { code: "C3", factor: "Conscientiousness", trait: "Dutifulness",           definition: "The tendency to have a sense of moral obligation and dutifulness, and practicing of good business ethics." },
  { code: "C4", factor: "Conscientiousness", trait: "Achievement striving",  definition: "The tendency to strive towards achieving well-defined, personally meaningful goals, being self-motivated." },
  { code: "C5", factor: "Conscientiousness", trait: "Self-discipline",       definition: "The tendency to persist at difficult or unpleasant tasks until they are completed." },
  { code: "C6", factor: "Conscientiousness", trait: "Deliberation",          definition: "The tendency or disposition to think carefully through the possibilities of any situation before action." },
  { code: "O1", factor: "Openness to experience", trait: "Creativity",         definition: "The tendency to use fantasy or imagination to produce unique and original ideas, by being inventive, imaginative." },
  { code: "O2", factor: "Openness to experience", trait: "Artistic interests", definition: "The tendency to get involved and engrossed in artistic and natural beauty and related events." },
  { code: "O3", factor: "Openness to experience", trait: "Actions",            definition: "The tendency to experience diversity in work, with a willingness to adjust to constraints and adversity." },
  { code: "O4", factor: "Openness to experience", trait: "Feelings",           definition: "The tendency to understand the emotions of others and recognize one's own feelings and emotions." },
  { code: "O5", factor: "Openness to experience", trait: "Values",             definition: "The tendency to accept and respect the individual differences of people and a desire to understand different cultures." },
  { code: "O6", factor: "Openness to experience", trait: "Curiosity",          definition: "The tendency to have intellectual and artistic interests and novelty-seeking." },
  { code: "ES1", factor: "Emotional stability", trait: "Self regard",       definition: "The tendency of self-acceptance, to have feelings of security, self-assuredness, and self-adequacy." },
  { code: "ES2", factor: "Emotional stability", trait: "Impulse control",   definition: "The tendency to resist or delay an impulse or drive to act, and being composed in adverse situations." },
  { code: "ES3", factor: "Emotional stability", trait: "Stress resilience", definition: "The tendency to withstand and deal with crisis and stressful situations without getting overwhelmed." },
  { code: "ES4", factor: "Emotional stability", trait: "Emotional control", definition: "The ability to understand, express, and control one's emotions in a balanced and adaptive manner." },
  { code: "ES5", factor: "Emotional stability", trait: "Happiness",         definition: "The tendency to feel content with oneself, others and life; to feel good and at ease in both work and leisure." },
  { code: "ES6", factor: "Emotional stability", trait: "Optimism",          definition: "The tendency to be optimistic about one's situation and to not feel anxious, nervous or unpleasant without a reason." },
];

// ── 30 Likert prompts (one per attribute, positive polarity) ─────────────────

const LIKERT_PROMPTS: Record<string, string> = {
  E1:  "I enjoy being around people and thrive in social situations.",
  E2:  "I genuinely like people and find it easy to express positive emotions.",
  E3:  "I naturally take the lead and influence the direction of group activities.",
  E4:  "I am fast-paced and energetic, often juggling multiple activities at once.",
  E5:  "I am comfortable making decisions and taking action with limited information.",
  E6:  "I frequently experience feelings of happiness, enthusiasm, and optimism.",
  A1:  "I believe most people have good intentions and can be trusted.",
  A2:  "I say what I mean honestly and directly, without hidden agendas.",
  A3:  "I actively look for ways to help others and derive satisfaction from doing so.",
  A4:  "I prefer to cooperate and accommodate others rather than insist on my own way.",
  A5:  "I prefer not to boast about my accomplishments even when I am proud of them.",
  A6:  "I feel genuine concern for people who are struggling and try to support them.",
  C1:  "I feel confident in my ability to get things done effectively.",
  C2:  "I keep my workspace and tasks well-organised and follow a clear structure.",
  C3:  "I take my responsibilities seriously and always follow through on commitments.",
  C4:  "I set ambitious personal goals and work hard until I achieve them.",
  C5:  "I persist with difficult tasks even when I feel like giving up.",
  C6:  "I think carefully through consequences before making important decisions.",
  O1:  "I regularly generate original ideas and enjoy creative problem solving.",
  O2:  "I have a deep appreciation for art, music, and aesthetic beauty.",
  O3:  "I enjoy variety and adapt easily when faced with new or unexpected situations.",
  O4:  "I am highly aware of my own emotions and sensitive to the feelings of others.",
  O5:  "I actively seek to understand and respect people from different backgrounds.",
  O6:  "I love learning new things and exploring ideas outside my usual areas of expertise.",
  ES1: "I feel comfortable with who I am and am not easily unsettled by others' opinions.",
  ES2: "I stay calm and composed under pressure rather than reacting impulsively.",
  ES3: "I bounce back quickly from setbacks and handle stressful situations effectively.",
  ES4: "I can manage and express my emotions in a balanced way even in difficult moments.",
  ES5: "I generally feel content and satisfied with both my work and personal life.",
  ES6: "I tend to expect positive outcomes and rarely worry without a specific reason.",
};

// ── 20 Triad definitions ──────────────────────────────────────────────────────
// Each entry: title + 3 statements (one per attribute code)

type TriadDef = {
  title: string;
  statements: Array<{ code: string; text: string }>;
};

const TRIADS: TriadDef[] = [
  // ── Round 1: T1–T10 ─────────────────────────────────────────────────────
  {
    title: "In a new team situation",
    statements: [
      { code: "E1", text: "I actively introduce myself and connect with new people in any group setting." },
      { code: "A1", text: "I give people the benefit of the doubt until they give me a reason not to." },
      { code: "C1", text: "I focus on demonstrating my abilities quickly to establish credibility." },
    ],
  },
  {
    title: "Working style with others",
    statements: [
      { code: "E2", text: "I make a point of warmly acknowledging the people I work with." },
      { code: "A2", text: "I say exactly what I mean, even when it might be uncomfortable." },
      { code: "C2", text: "I keep my workspace and workflow neatly organised at all times." },
    ],
  },
  {
    title: "When the team needs direction",
    statements: [
      { code: "E3", text: "I naturally step up and take the lead when a group needs direction." },
      { code: "A3", text: "I look for ways to support whoever in the team is struggling." },
      { code: "C3", text: "I make sure we follow the agreed process and meet our commitments." },
    ],
  },
  {
    title: "Approach to daily work",
    statements: [
      { code: "E4", text: "I prefer to keep busy with several projects running at the same time." },
      { code: "A4", text: "I adapt my approach to fit what the team or manager needs." },
      { code: "C4", text: "I set ambitious personal targets and push myself to exceed them." },
    ],
  },
  {
    title: "Facing uncertainty",
    statements: [
      { code: "E5", text: "I am energised by situations where the outcome is uncertain." },
      { code: "A5", text: "I let my results speak for themselves rather than promoting my achievements." },
      { code: "C5", text: "I stay committed to completing a task even when it becomes difficult." },
    ],
  },
  {
    title: "How you bring value to a team",
    statements: [
      { code: "E6", text: "I bring enthusiasm and optimism that lifts the mood of those around me." },
      { code: "A6", text: "I notice when colleagues are struggling and offer genuine support." },
      { code: "C6", text: "I think through all possible consequences before making any decision." },
    ],
  },
  {
    title: "Facing a complex challenge",
    statements: [
      { code: "O1",  text: "I enjoy generating unconventional ideas others would not have considered." },
      { code: "O4",  text: "I pay close attention to the emotional undercurrents in any situation." },
      { code: "ES1", text: "I feel comfortable in my own skin regardless of others' opinions of me." },
    ],
  },
  {
    title: "What you bring to relationships",
    statements: [
      { code: "O2",  text: "I naturally appreciate beauty and aesthetics in my environment and work." },
      { code: "O5",  text: "I am genuinely curious about people whose backgrounds differ from mine." },
      { code: "ES2", text: "I pause and reflect before reacting, even in tense situations." },
    ],
  },
  {
    title: "When facing change",
    statements: [
      { code: "O3",  text: "I adapt easily and find variety in my work energising." },
      { code: "O6",  text: "I actively seek out new information and enjoy exploring unfamiliar ideas." },
      { code: "ES3", text: "I recover quickly from setbacks and keep moving forward under pressure." },
    ],
  },
  {
    title: "Your emotional orientation",
    statements: [
      { code: "ES4", text: "I manage my emotions calmly even in highly charged situations." },
      { code: "ES5", text: "I feel genuinely content and satisfied with my work and personal life." },
      { code: "ES6", text: "I tend to expect positive outcomes even when circumstances look uncertain." },
    ],
  },
  // ── Round 2: T11–T20 ────────────────────────────────────────────────────
  {
    title: "In a team brainstorming session",
    statements: [
      { code: "E1",  text: "I get energised drawing people into the conversation and making everyone feel included." },
      { code: "O1",  text: "I love generating bold ideas and exploring possibilities no one else has thought of." },
      { code: "ES4", text: "I stay calm and composed, helping the group think clearly even under pressure." },
    ],
  },
  {
    title: "What makes a great work environment",
    statements: [
      { code: "E2",  text: "Strong personal connections and genuine warmth between colleagues matter most to me." },
      { code: "O2",  text: "Aesthetically pleasing, well-designed spaces and outputs inspire my best work." },
      { code: "ES5", text: "A sense of overall wellbeing and contentment makes everything else possible." },
    ],
  },
  {
    title: "When facing a difficult challenge",
    statements: [
      { code: "E3",  text: "I take charge, rally the group and push toward a clear solution." },
      { code: "O3",  text: "I welcome the change as an opportunity to try new approaches." },
      { code: "ES6", text: "I stay positive and confident that we will find a way through." },
    ],
  },
  {
    title: "Motivating a team",
    statements: [
      { code: "E4", text: "I lead by example with high energy that drives momentum for everyone." },
      { code: "O4", text: "I connect with what each person feels and needs to help them engage." },
      { code: "A1", text: "I create a safe environment by trusting people to do their best." },
    ],
  },
  {
    title: "Making a key decision",
    statements: [
      { code: "E5", text: "I am comfortable making bold calls even when information is incomplete." },
      { code: "O5", text: "I make sure diverse perspectives are considered before deciding." },
      { code: "A2", text: "I state my honest opinion clearly, even if it is not what others want to hear." },
    ],
  },
  {
    title: "What energises you most",
    statements: [
      { code: "E6", text: "Enthusiasm and positive energy from the people around me." },
      { code: "O6", text: "Discovering new ideas and exploring questions I have never considered." },
      { code: "A3", text: "Knowing my work genuinely helps and improves the lives of others." },
    ],
  },
  {
    title: "Under scrutiny or evaluation",
    statements: [
      { code: "C1",  text: "I feel confident that my skills and capabilities will meet the standard." },
      { code: "ES1", text: "I remain grounded and secure in who I am, regardless of the outcome." },
      { code: "A4",  text: "I cooperate fully with the process and trust those overseeing it." },
    ],
  },
  {
    title: "How you handle success",
    statements: [
      { code: "C2",  text: "I document what worked so I can repeat and build on it systematically." },
      { code: "ES2", text: "I stay measured and think carefully about next steps rather than celebrating too soon." },
      { code: "A5",  text: "I acknowledge the team's contribution and downplay my individual role." },
    ],
  },
  {
    title: "When the team is under pressure",
    statements: [
      { code: "C3",  text: "I ensure we uphold our responsibilities and don't cut corners under pressure." },
      { code: "ES3", text: "I keep my composure and help stabilise the team's focus." },
      { code: "A6",  text: "I check in with colleagues to offer support and make sure no one is overwhelmed." },
    ],
  },
  {
    title: "Approaching a long-term goal",
    statements: [
      { code: "C4", text: "I set bold targets and push myself hard until I achieve them." },
      { code: "C5", text: "I maintain consistent effort every day, even when motivation fluctuates." },
      { code: "C6", text: "I plan carefully, considering all angles before committing to a course of action." },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "techgrah-demo" } });
  if (!tenant) throw new Error("Tenant 'techgrah-demo' not found. Run the main seed first.");

  const candidate = await prisma.candidate.findFirst({ where: { email: "alex.chen@example.com" } });
  if (!candidate) throw new Error("Candidate alex.chen not found. Run the main seed first.");

  // ── Clean up previous version of this assessment ──────────────────────────
  const existing = await prisma.assessment.findFirst({
    where: { tenantId: tenant.id, title: "Big Five Psychometric Assessment" },
  });
  if (existing) {
    await prisma.assessmentAssignment.deleteMany({ where: { assessmentId: existing.id } });
    await prisma.assessment.delete({ where: { id: existing.id } });
    console.log("Deleted previous 'Big Five Psychometric Assessment'");
  }

  // ── Build attribute lookups ───────────────────────────────────────────────
  const dbAttrs = await prisma.attribute.findMany({ where: { tenantId: tenant.id } });
  const attrByCode = new Map(dbAttrs.map((a) => [a.code, a]));
  // attrByTrait: look up by the trait *name* string — used for triad statement
  // attributeId assignment to avoid any code→id ordering mismatch.
  const attrByTrait = new Map(dbAttrs.map((a) => [a.name.toLowerCase(), a]));

  // Verify all 30 attributes exist
  const missing = ATTRIBUTES.map((a) => a.code).filter((c) => !attrByCode.has(c));
  if (missing.length > 0) {
    console.warn(`⚠ Missing attribute codes in DB: ${missing.join(", ")}`);
    console.warn("Run 'npx tsx prisma/seed-competencies.ts' first.");
  }

  // ── Create assessment ─────────────────────────────────────────────────────
  const assessment = await prisma.assessment.create({
    data: {
      tenantId: tenant.id,
      title: "Big Five Psychometric Assessment",
      description: "Full Big Five personality assessment: 30 Likert items + 20 forced-choice triads (50 questions total). Each of the 30 attributes is measured once via Likert and twice via forced-choice, for a per-attribute raw score range of 4–14.",
      assessmentType: "HYBRID",
      reportTemplateType: "PSYCHOMETRIC_TRAIT_REPORT",
      durationMinutes: 45,
      maxAttempts: 1,
      lifecycleStatus: "published",
      isActive: true,
    },
  });
  console.log("✅ Created assessment:", assessment.id);

  // ── Section 1: Likert ─────────────────────────────────────────────────────
  const likertSection = await prisma.assessmentSection.create({
    data: {
      assessmentId: assessment.id,
      title: "Personality Statements",
      displayOrder: 0,
    },
  });

  for (let i = 0; i < ATTRIBUTES.length; i++) {
    const a = ATTRIBUTES[i];
    const attr = attrByCode.get(a.code);
    await prisma.assessmentItem.create({
      data: {
        assessmentId: assessment.id,
        sectionId: likertSection.id,
        itemType: "LIKERT",
        prompt: LIKERT_PROMPTS[a.code],
        factor: a.factor,
        trait: a.trait,
        definition: a.definition,
        polarity: "POSITIVE",
        attributeId: attr?.id ?? null,
        displayOrder: i,
      },
    });
  }
  console.log(`✅ Created 30 Likert items`);

  // ── Section 2: Triads ─────────────────────────────────────────────────────
  const triadSection = await prisma.assessmentSection.create({
    data: {
      assessmentId: assessment.id,
      title: "Situational Preferences",
      displayOrder: 1,
    },
  });

  for (let t = 0; t < TRIADS.length; t++) {
    const triad = TRIADS[t];
    const group = await prisma.triadGroup.create({
      data: {
        assessmentId: assessment.id,
        sectionId: triadSection.id,
        title: triad.title,
        tenantId: tenant.id,
        displayOrder: t,
      },
    });

    for (let s = 0; s < triad.statements.length; s++) {
      const st = triad.statements[s];
      const attrDef = ATTRIBUTES.find((a) => a.code === st.code);
      if (!attrDef) throw new Error(`Unknown attribute code: ${st.code}`);
      // Resolve attributeId by trait *name* (not by code) to avoid any
      // code→id ordering mismatch that would create a wrong FK.
      const attrRow = attrByTrait.get(attrDef.trait.toLowerCase());
      await prisma.triadStatement.create({
        data: {
          triadGroupId: group.id,
          statementText: st.text,
          factor: attrDef.factor,
          trait: attrDef.trait,
          definition: attrDef.definition,
          polarity: "POSITIVE",
          attributeId: attrRow?.id ?? null,
          displayOrder: s,
        },
      });
    }
  }
  console.log(`✅ Created 20 Triad groups (60 statements)`);

  // ── Reconcile triad statement attributeId values ──────────────────────────
  // Guard against any seed ordering issues: re-build attrByName lookup and
  // fix every TriadStatement whose attributeId doesn't match its trait text.
  const attrByName = new Map(dbAttrs.map((a) => [a.name.toLowerCase(), a]));
  const allStatements = await prisma.triadStatement.findMany({
    where: { triadGroup: { assessmentId: assessment.id } },
    select: { id: true, trait: true, attributeId: true },
  });
  let fixedCount = 0;
  for (const stmt of allStatements) {
    const correct = attrByName.get(stmt.trait.toLowerCase());
    if (correct && correct.id !== stmt.attributeId) {
      await prisma.triadStatement.update({
        where: { id: stmt.id },
        data: { attributeId: correct.id },
      });
      fixedCount++;
    }
  }
  if (fixedCount > 0) {
    console.log(`🔧 Reconciled ${fixedCount} triad statement attributeId values (trait→attribute FK mismatch)`);
  } else {
    console.log("✅ All triad statement attributeId values are correct.");
  }

  // ── Assign to Alex Chen ───────────────────────────────────────────────────
  await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate.id,
      assessmentId: assessment.id,
      status: "assigned",
    },
  });
  console.log("✅ Assigned to Alex Chen (alex.chen@example.com)");
  console.log("\n🎉 Done! Assessment ID:", assessment.id);
  console.log("\nAttribute coverage check:");

  // Verify each attribute appears exactly twice in triads
  const traitCount = new Map<string, number>();
  for (const triad of TRIADS) {
    for (const st of triad.statements) {
      traitCount.set(st.code, (traitCount.get(st.code) ?? 0) + 1);
    }
  }
  const wrong = Array.from(traitCount.entries()).filter(([, count]) => count !== 2);
  if (wrong.length === 0) {
    console.log("✅ All 30 attributes appear exactly twice in triads.");
  } else {
    console.warn("⚠ Attribute triad appearance count mismatch:", wrong);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
