/**
 * TimespPro Personality Inventory v1.0 — full question seed
 *
 * Replaces the old 50-question assessment with the official TPI v1.0 design:
 *   - 30 Likert items (mixed polarity: positive items scored 1–5, negative reverse-scored)
 *   - 40 Forced-choice triads (Q1–Q20 positive scoring, Q21–Q40 negative scoring)
 *
 * Each of the 30 facets appears:
 *   - 1× in Likert
 *   - 4× in Forced-choice (2 positive triads + 2 negative triads)
 *
 * Per-facet raw score range: 1 (Likert) + 4×1 (FC) = 5  min
 *                            5 (Likert) + 4×3 (FC) = 17 max
 * Conversion to 10-pt scale: 1 + (raw − 5) × 9 / 12
 *
 * Scoring engine already handles polarity correctly:
 *   Likert NEGATIVE  → reverse-scored (6 − response)
 *   Triad  NEGATIVE  → Most=1, Not-chosen=2, Least=3
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

// ── Attribute definitions (trait names must match the Attribute table exactly) ─

type AttrDef = { code: string; factor: string; trait: string; definition: string };

const ATTRIBUTES: AttrDef[] = [
  { code: "E1",  factor: "Extraversion",          trait: "Sociability",          definition: "The tendency to seek, enjoy, and actively participate in social interaction." },
  { code: "E2",  factor: "Extraversion",          trait: "Warmth",               definition: "The tendency to show genuine interest, friendliness, and positive regard toward others." },
  { code: "E3",  factor: "Extraversion",          trait: "Assertiveness",        definition: "The tendency to express views confidently, influence others, and take social initiative." },
  { code: "E4",  factor: "Extraversion",          trait: "Energy level",         definition: "The tendency to remain active, vigorous, and fast-paced across tasks and situations." },
  { code: "E5",  factor: "Extraversion",          trait: "Risk taking",          definition: "The tendency to explore uncertain options and act despite incomplete information." },
  { code: "E6",  factor: "Extraversion",          trait: "Positive emotion",     definition: "The tendency to experience and express enthusiasm, joy, and positive affect." },
  { code: "A1",  factor: "Agreeableness",         trait: "Trust",                definition: "The tendency to believe that others are generally honest, reliable, and well-intentioned." },
  { code: "A2",  factor: "Agreeableness",         trait: "Straightforwardness",  definition: "The tendency to communicate candidly, plainly, and without manipulation." },
  { code: "A3",  factor: "Agreeableness",         trait: "Altruism",             definition: "The tendency to help others and respond supportively to their needs." },
  { code: "A4",  factor: "Agreeableness",         trait: "Compliance",           definition: "The tendency to cooperate, compromise, and maintain harmony during disagreement." },
  { code: "A5",  factor: "Agreeableness",         trait: "Modesty",              definition: "The tendency to remain humble and balanced when discussing personal achievements." },
  { code: "A6",  factor: "Agreeableness",         trait: "Sympathy",             definition: "The tendency to show compassion and emotional sensitivity toward others." },
  { code: "C1",  factor: "Conscientiousness",     trait: "Competence",           definition: "The tendency to feel capable, effective, and confident in completing tasks." },
  { code: "C2",  factor: "Conscientiousness",     trait: "Orderliness",          definition: "The tendency to stay organised, structured, and systematic." },
  { code: "C3",  factor: "Conscientiousness",     trait: "Dutifulness",          definition: "The tendency to honour commitments, rules, and accepted responsibilities." },
  { code: "C4",  factor: "Conscientiousness",     trait: "Achievement striving", definition: "The tendency to pursue challenging goals and maintain high standards." },
  { code: "C5",  factor: "Conscientiousness",     trait: "Self-discipline",      definition: "The tendency to persist until tasks are completed despite difficulty or distraction." },
  { code: "C6",  factor: "Conscientiousness",     trait: "Deliberation",         definition: "The tendency to think carefully before acting or deciding." },
  { code: "O1",  factor: "Openness to experience", trait: "Creativity",          definition: "The tendency to generate original ideas and use imagination productively." },
  { code: "O2",  factor: "Openness to experience", trait: "Artistic interests",  definition: "The tendency to appreciate aesthetics, design, art, nature, and sensory beauty." },
  { code: "O3",  factor: "Openness to experience", trait: "Actions",             definition: "The tendency to try new approaches and adapt behaviour to changing situations." },
  { code: "O4",  factor: "Openness to experience", trait: "Feelings",            definition: "The tendency to notice, understand, and reflect on emotions in oneself and others." },
  { code: "O5",  factor: "Openness to experience", trait: "Values",              definition: "The tendency to respect diverse perspectives, beliefs, and ways of thinking." },
  { code: "O6",  factor: "Openness to experience", trait: "Curiosity",           definition: "The tendency to seek knowledge, ask questions, and explore unfamiliar ideas." },
  { code: "ES1", factor: "Emotional stability",   trait: "Self regard",          definition: "The tendency to feel secure, self-accepting, and confident about one's own worth." },
  { code: "ES2", factor: "Emotional stability",   trait: "Impulse control",      definition: "The tendency to pause, regulate urges, and respond thoughtfully." },
  { code: "ES3", factor: "Emotional stability",   trait: "Stress resilience",    definition: "The tendency to remain functional and composed under pressure." },
  { code: "ES4", factor: "Emotional stability",   trait: "Emotional control",    definition: "The tendency to manage emotional reactions in a balanced manner." },
  { code: "ES5", factor: "Emotional stability",   trait: "Happiness",            definition: "The tendency to feel content, satisfied, and at ease with life." },
  { code: "ES6", factor: "Emotional stability",   trait: "Optimism",             definition: "The tendency to expect constructive possibilities and maintain hopefulness." },
];

// ── 30 Likert items (mixed polarity per TPI v1.0) ────────────────────────────
// Positive  → scored 1–5
// Negative  → reverse-scored (6 − response)

type LikertDef = { code: string; polarity: "POSITIVE" | "NEGATIVE"; prompt: string };

const LIKERT_ITEMS: LikertDef[] = [
  { code: "E1",  polarity: "POSITIVE", prompt: "I can start conversations in new groups." },
  { code: "E2",  polarity: "NEGATIVE", prompt: "I seem distant when others try to connect with me." },
  { code: "E3",  polarity: "POSITIVE", prompt: "I share my views clearly in group discussions." },
  { code: "E4",  polarity: "NEGATIVE", prompt: "I slow down quickly when many things need attention." },
  { code: "E5",  polarity: "POSITIVE", prompt: "I am comfortable trying new things, even when the result is uncertain." },
  { code: "E6",  polarity: "NEGATIVE", prompt: "I find it hard to show excitement when things go well." },
  { code: "A1",  polarity: "POSITIVE", prompt: "I usually believe people mean well." },
  { code: "A2",  polarity: "NEGATIVE", prompt: "I hide what I really think, even when honesty would help." },
  { code: "A3",  polarity: "POSITIVE", prompt: "I help others even when it takes extra time." },
  { code: "A4",  polarity: "NEGATIVE", prompt: "I refuse to compromise even when it would help." },
  { code: "A5",  polarity: "POSITIVE", prompt: "I talk about my achievements without seeking too much attention." },
  { code: "A6",  polarity: "NEGATIVE", prompt: "I do not feel much concern when someone is struggling." },
  { code: "C1",  polarity: "POSITIVE", prompt: "I feel capable of handling difficult tasks." },
  { code: "C2",  polarity: "NEGATIVE", prompt: "I leave things messy until they become a problem." },
  { code: "C3",  polarity: "POSITIVE", prompt: "I take my commitments seriously." },
  { code: "C4",  polarity: "NEGATIVE", prompt: "I do only the minimum when that is enough." },
  { code: "C5",  polarity: "POSITIVE", prompt: "I keep working until important tasks are finished." },
  { code: "C6",  polarity: "NEGATIVE", prompt: "I decide before thinking about the consequences." },
  { code: "O1",  polarity: "POSITIVE", prompt: "I think of new ideas when usual solutions do not work." },
  { code: "O2",  polarity: "NEGATIVE", prompt: "I rarely notice beauty or design around me." },
  { code: "O3",  polarity: "POSITIVE", prompt: "I change my approach when the situation changes." },
  { code: "O4",  polarity: "NEGATIVE", prompt: "I often miss how my feelings affect my behaviour." },
  { code: "O5",  polarity: "POSITIVE", prompt: "I respect people with different beliefs." },
  { code: "O6",  polarity: "NEGATIVE", prompt: "I prefer familiar topics over new ideas." },
  { code: "ES1", polarity: "POSITIVE", prompt: "I feel comfortable with who I am." },
  { code: "ES2", polarity: "NEGATIVE", prompt: "I act on urges before I think." },
  { code: "ES3", polarity: "POSITIVE", prompt: "I stay calm when things become stressful." },
  { code: "ES4", polarity: "NEGATIVE", prompt: "I react strongly when I feel criticised." },
  { code: "ES5", polarity: "POSITIVE", prompt: "I feel satisfied with my life most of the time." },
  { code: "ES6", polarity: "NEGATIVE", prompt: "I expect problems more than possibilities." },
];

// ── 40 Forced-choice triads ───────────────────────────────────────────────────
// Q1–Q20:  POSITIVE scoring  (Most=3, Not-chosen=2, Least=1)
// Q21–Q40: NEGATIVE scoring  (Most=1, Not-chosen=2, Least=3)
//
// Each of the 30 facets appears exactly 4× total (2 positive + 2 negative).

type TriadStmt = { code: string; text: string };
type TriadDef  = { stem: string; polarity: "POSITIVE" | "NEGATIVE"; statements: TriadStmt[] };

const TRIADS: TriadDef[] = [
  // ── Q1–Q20: Positive triads ──────────────────────────────────────────────
  {
    stem: "In a new group setting,",
    polarity: "POSITIVE",
    statements: [
      { code: "E1", text: "I introduce myself to new people." },
      { code: "E2", text: "I make others feel welcome." },
      { code: "E3", text: "I share my views clearly." },
    ],
  },
  {
    stem: "When working on an important task,",
    polarity: "POSITIVE",
    statements: [
      { code: "E4", text: "I stay active and involved." },
      { code: "C4", text: "I try to do more than the minimum." },
      { code: "C2", text: "I keep my work organised." },
    ],
  },
  {
    stem: "During a team discussion,",
    polarity: "POSITIVE",
    statements: [
      { code: "E5", text: "I try options even when the result is uncertain." },
      { code: "O6", text: "I ask questions to learn more." },
      { code: "ES6", text: "I believe a solution can be found." },
    ],
  },
  {
    stem: "When a discussion becomes tense,",
    polarity: "POSITIVE",
    statements: [
      { code: "A1", text: "I assume people have fair intentions." },
      { code: "A2", text: "I say what I mean respectfully." },
      { code: "O4", text: "I notice how I feel." },
    ],
  },
  {
    stem: "When an uncertain opportunity appears,",
    polarity: "POSITIVE",
    statements: [
      { code: "A3", text: "I help when someone has too much to do." },
      { code: "A6", text: "I feel concern when someone is struggling." },
      { code: "A4", text: "I look for a fair middle path." },
    ],
  },
  {
    stem: "When something goes better than expected,",
    polarity: "POSITIVE",
    statements: [
      { code: "A5",  text: "I do not overstate my role." },
      { code: "ES1", text: "I feel secure about my own worth." },
      { code: "ES5", text: "I feel content with life overall." },
    ],
  },
  {
    stem: "When completing a shared task,",
    polarity: "POSITIVE",
    statements: [
      { code: "C1", text: "I handle my part with confidence." },
      { code: "C3", text: "I do what I agreed to do." },
      { code: "C5", text: "I stay focused until the task is done." },
    ],
  },
  {
    stem: "When I feel like reacting quickly,",
    polarity: "POSITIVE",
    statements: [
      { code: "C6",  text: "I think before I act." },
      { code: "ES2", text: "I pause before acting on an urge." },
      { code: "ES4", text: "I control my reaction before speaking." },
    ],
  },
  {
    stem: "When looking for a better way to do something,",
    polarity: "POSITIVE",
    statements: [
      { code: "O1", text: "I suggest new ways to solve problems." },
      { code: "O2", text: "I notice beauty and design." },
      { code: "O3", text: "I try a different method when needed." },
    ],
  },
  {
    stem: "During a disagreement,",
    polarity: "POSITIVE",
    statements: [
      { code: "O5",  text: "I respect views that are different from mine." },
      { code: "ES3", text: "I stay steady under pressure." },
      { code: "E6",  text: "I bring a positive tone." },
    ],
  },
  {
    stem: "When taking part in a group conversation,",
    polarity: "POSITIVE",
    statements: [
      { code: "E1", text: "I join in and interact with others." },
      { code: "E4", text: "I stay engaged through the conversation." },
      { code: "E6", text: "I keep a pleasant tone." },
    ],
  },
  {
    stem: "When another person is upset,",
    polarity: "POSITIVE",
    statements: [
      { code: "E2", text: "I show friendly behaviour." },
      { code: "A1", text: "I give people a fair chance." },
      { code: "A6", text: "I respond with care." },
    ],
  },
  {
    stem: "When facing a complex task,",
    polarity: "POSITIVE",
    statements: [
      { code: "E3", text: "I speak clearly about what I can contribute." },
      { code: "C1", text: "I believe I can complete the work." },
      { code: "C4", text: "I push myself toward high standards." },
    ],
  },
  {
    stem: "While managing several responsibilities,",
    polarity: "POSITIVE",
    statements: [
      { code: "E5", text: "I explore options when the result is not certain." },
      { code: "O3", text: "I adapt to new situations." },
      { code: "O1", text: "I combine ideas in new ways." },
    ],
  },
  {
    stem: "When accepting a commitment,",
    polarity: "POSITIVE",
    statements: [
      { code: "A2", text: "I explain my position clearly." },
      { code: "C3", text: "I treat my duties as important." },
      { code: "O5", text: "I accept views different from mine." },
    ],
  },
  {
    stem: "When a group decision affects everyone,",
    polarity: "POSITIVE",
    statements: [
      { code: "A3", text: "I consider what others may need." },
      { code: "A4", text: "I adjust my position when harmony matters." },
      { code: "A5", text: "I share credit with others." },
    ],
  },
  {
    stem: "When a task becomes difficult,",
    polarity: "POSITIVE",
    statements: [
      { code: "C2", text: "I keep details organised." },
      { code: "C6", text: "I compare options before deciding." },
      { code: "C5", text: "I continue even when the task is hard." },
    ],
  },
  {
    stem: "Before making an important choice,",
    polarity: "POSITIVE",
    statements: [
      { code: "O4",  text: "I reflect on what my feelings mean." },
      { code: "ES4", text: "I keep my emotions balanced." },
      { code: "ES3", text: "I keep going without feeling overwhelmed." },
    ],
  },
  {
    stem: "When solving an unusual problem,",
    polarity: "POSITIVE",
    statements: [
      { code: "O6",  text: "I look for more information than required." },
      { code: "O2",  text: "I appreciate design and beauty." },
      { code: "ES6", text: "I focus on possibilities." },
    ],
  },
  {
    stem: "When observing a place, product, or design,",
    polarity: "POSITIVE",
    statements: [
      { code: "ES1", text: "I trust my own opinion." },
      { code: "ES5", text: "I notice what feels pleasant." },
      { code: "ES2", text: "I take a moment before judging it." },
    ],
  },

  // ── Q21–Q40: Negative triads ─────────────────────────────────────────────
  {
    stem: "When plans suddenly change,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E1", text: "I avoid involving people around me." },
      { code: "A1", text: "I doubt that cooperation is possible." },
      { code: "A3", text: "I avoid contributing when I gain less." },
    ],
  },
  {
    stem: "During an emotionally charged moment,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E2",  text: "I respond coldly when others approach me." },
      { code: "E6",  text: "I fail to appreciate progress." },
      { code: "ES5", text: "I rarely feel at ease through the day." },
    ],
  },
  {
    stem: "When hearing a viewpoint different from mine,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E3", text: "I hold back my view even when I have something to say." },
      { code: "E5", text: "I avoid sharing an idea unless I am sure it will be accepted." },
      { code: "C1", text: "I doubt whether my opinion is worth sharing." },
    ],
  },
  {
    stem: "When a task feels difficult to finish,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E4",  text: "I lose energy when the task feels demanding." },
      { code: "C5",  text: "I let distractions stop me from finishing work." },
      { code: "ES3", text: "I feel overwhelmed before taking the next step." },
    ],
  },
  {
    stem: "When I think about myself,",
    polarity: "NEGATIVE",
    statements: [
      { code: "A2", text: "I avoid facing the truth about my actions." },
      { code: "A4", text: "I find it hard to admit when I am wrong." },
      { code: "C3", text: "I excuse myself from responsibilities I should meet." },
    ],
  },
  {
    stem: "When I receive attention from others,",
    polarity: "NEGATIVE",
    statements: [
      { code: "A5",  text: "I make the moment mostly about me." },
      { code: "O5",  text: "I dismiss views that are different from mine." },
      { code: "ES1", text: "I look to others to feel good about myself." },
    ],
  },
  {
    stem: "When pressure increases,",
    polarity: "NEGATIVE",
    statements: [
      { code: "C2",  text: "I move ahead without creating structure." },
      { code: "C6",  text: "I rush and make avoidable mistakes." },
      { code: "ES2", text: "I act quickly just because I feel pushed." },
    ],
  },
  {
    stem: "When I receive critical feedback,",
    polarity: "NEGATIVE",
    statements: [
      { code: "C4", text: "I stop trying to improve the outcome." },
      { code: "O1", text: "I stay with only the obvious options." },
      { code: "O6", text: "I avoid finding out how things work." },
    ],
  },
  {
    stem: "When reflecting on my life, I feel",
    polarity: "NEGATIVE",
    statements: [
      { code: "A6",  text: "I avoid situations when someone needs support." },
      { code: "O4",  text: "I ignore how emotions affect behaviour." },
      { code: "ES4", text: "I lose calm when provoked." },
    ],
  },
  {
    stem: "When thinking about the future,",
    polarity: "NEGATIVE",
    statements: [
      { code: "O3",  text: "I prefer things to stay the same." },
      { code: "O2",  text: "I rarely imagine how things could look or feel." },
      { code: "ES6", text: "I find it hard to expect better outcomes." },
    ],
  },
  {
    stem: "When joining a project,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E1", text: "I avoid taking part actively with others." },
      { code: "E3", text: "I avoid taking the lead when direction is needed." },
      { code: "E5", text: "I avoid worthwhile chances." },
    ],
  },
  {
    stem: "When others are unsure what to do,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E2", text: "I do little to create a pleasant tone with others." },
      { code: "E6", text: "I miss reasons to feel encouraged." },
      { code: "A1", text: "I suspect others without enough reason." },
    ],
  },
  {
    stem: "When handling a tight deadline,",
    polarity: "NEGATIVE",
    statements: [
      { code: "E4", text: "I struggle to bring energy to the task." },
      { code: "C1", text: "I feel unsure about handling responsibility." },
      { code: "C4", text: "I avoid setting goals that stretch me." },
    ],
  },
  {
    stem: "When a sensitive issue has to be addressed,",
    polarity: "NEGATIVE",
    statements: [
      { code: "A2", text: "I avoid saying what needs to be said." },
      { code: "A3", text: "I avoid doing my part to help the situation." },
      { code: "A6", text: "I show little care for how others are affected." },
    ],
  },
  {
    stem: "When a conflict has to be resolved,",
    polarity: "NEGATIVE",
    statements: [
      { code: "A4", text: "I reject compromise even when it is fair." },
      { code: "A5", text: "I try to make my view seem more important than others'." },
      { code: "O5", text: "I struggle to accept that people see things differently." },
    ],
  },
  {
    stem: "When a decision involves trade-offs,",
    polarity: "NEGATIVE",
    statements: [
      { code: "C2", text: "I lose track of important details." },
      { code: "C3", text: "I avoid responsibilities that feel inconvenient." },
      { code: "C6", text: "I decide before thinking through the risks." },
    ],
  },
  {
    stem: "When learning something new,",
    polarity: "NEGATIVE",
    statements: [
      { code: "C5",  text: "I give up when progress is slow." },
      { code: "ES2", text: "I act without giving myself time to think." },
      { code: "ES3", text: "I lose steadiness in difficult situations." },
    ],
  },
  {
    stem: "When someone challenges my view,",
    polarity: "NEGATIVE",
    statements: [
      { code: "O1", text: "I struggle to think of another way to explain my view." },
      { code: "O3", text: "I avoid changing my approach, even when it may help." },
      { code: "O6", text: "I avoid trying to understand the other person's reasoning." },
    ],
  },
  {
    stem: "When I reflect on how things went,",
    polarity: "NEGATIVE",
    statements: [
      { code: "O4",  text: "I miss how my emotions shaped my response." },
      { code: "ES4", text: "I let my feelings affect my behaviour too much." },
      { code: "ES5", text: "I focus more on what went wrong than what felt satisfying." },
    ],
  },
  {
    stem: "When unexpected problems arise,",
    polarity: "NEGATIVE",
    statements: [
      { code: "O2",  text: "I miss details in how things look or feel." },
      { code: "ES1", text: "I blame myself too harshly." },
      { code: "ES6", text: "I find it hard to believe things can improve." },
    ],
  },
];

// ── Verification: each facet must appear exactly 4× in FC triads ─────────────

function verifyFacetCoverage() {
  const counts = new Map<string, number>();
  for (const t of TRIADS) {
    for (const s of t.statements) {
      counts.set(s.code, (counts.get(s.code) ?? 0) + 1);
    }
  }
  const wrong = [...counts.entries()].filter(([, n]) => n !== 4);
  if (wrong.length > 0) {
    throw new Error(`Facet coverage error — expected 4 appearances each: ${JSON.stringify(wrong)}`);
  }
  const missing = ATTRIBUTES.map((a) => a.code).filter((c) => !counts.has(c));
  if (missing.length > 0) throw new Error(`Missing facets in triads: ${missing.join(", ")}`);
  console.log("✅ Facet coverage verified: all 30 facets appear 4× in FC triads");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  verifyFacetCoverage();

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found. Run the main seed first.");

  // Clear existing pool questions (assessmentId = null means they are pool-only)
  const existingLikert = await prisma.assessmentItem.count({ where: { assessmentId: null } });
  const existingTriads = await prisma.triadGroup.count({ where: { assessmentId: null } });
  if (existingLikert > 0 || existingTriads > 0) {
    await prisma.assessmentItem.deleteMany({ where: { assessmentId: null } });
    await prisma.triadGroup.deleteMany({ where: { assessmentId: null } });
    console.log(`Cleared ${existingLikert} pool Likert items and ${existingTriads} pool triad groups.`);
  }

  // Build attribute lookups
  const dbAttrs = await prisma.attribute.findMany({ where: { tenantId: tenant.id } });
  const attrByCode  = new Map(dbAttrs.map((a) => [a.code, a]));
  const attrByTrait = new Map(dbAttrs.map((a) => [a.name.toLowerCase(), a]));

  const missingCodes = ATTRIBUTES.map((a) => a.code).filter((c) => !attrByCode.has(c));
  if (missingCodes.length > 0) {
    console.warn(`⚠ Missing attribute codes in DB: ${missingCodes.join(", ")} — run seed-competencies first`);
  }

  // Create 30 pool Likert items (no assessment, no section)
  for (let i = 0; i < LIKERT_ITEMS.length; i++) {
    const item = LIKERT_ITEMS[i];
    const attrDef = ATTRIBUTES.find((a) => a.code === item.code)!;
    const attr = attrByCode.get(item.code);
    await prisma.assessmentItem.create({
      data: {
        itemType: "LIKERT",
        prompt: item.prompt,
        factor: attrDef.factor,
        trait: attrDef.trait,
        definition: attrDef.definition,
        polarity: item.polarity,
        attributeId: attr?.id ?? null,
        displayOrder: i,
      },
    });
  }
  console.log("✅ Created 30 pool Likert items (no assessment attached)");

  // Create 40 pool Triad groups (no assessment, no section)
  for (let t = 0; t < TRIADS.length; t++) {
    const triad = TRIADS[t];
    const group = await prisma.triadGroup.create({
      data: {
        title: triad.stem,
        tenantId: tenant.id,
        displayOrder: t,
        statements: {
          create: triad.statements.map((st, s) => {
            const attrDef = ATTRIBUTES.find((a) => a.code === st.code)!;
            const attrRow = attrByTrait.get(attrDef.trait.toLowerCase());
            return {
              statementText: st.text,
              factor: attrDef.factor,
              trait: attrDef.trait,
              definition: attrDef.definition,
              polarity: triad.polarity,
              attributeId: attrRow?.id ?? null,
              displayOrder: s,
            };
          }),
        },
      },
    });
    void group;
  }
  console.log("✅ Created 40 pool Triad groups (no assessment attached)");

  console.log("\n🎉 TPI v1.0 question pool seed complete!");
  console.log(`   Likert items : 30 (mixed polarity) — free-floating pool`);
  console.log(`   Triads       : 40 (Q1–Q20 positive, Q21–Q40 negative) — free-floating pool`);
  console.log(`   Total        : 70 questions, no assessment container needed`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
