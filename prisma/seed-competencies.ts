import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:")
  ? databaseUrl.slice("file:".length)
  : databaseUrl;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: sqliteUrl }),
});

// ── Data from "Attributes and scoring logic.xlsx" ────────────────────────────

const ATTRIBUTES = [
  // Extraversion
  { code: "E1", name: "Sociability",      category: "Extraversion", description: "The tendency to be highly active in any social situation, with a high need for interpersonal interaction and social involvement." },
  { code: "E2", name: "Warmth",           category: "Extraversion", description: "The tendency to genuinely like other people and explicitly express positive emotions towards others." },
  { code: "E3", name: "Assertiveness",    category: "Extraversion", description: "The tendency to influence and direct the actions of others, by initiation, persuasion, good negotiation skills, social ascendancy and diplomatic behavior." },
  { code: "E4", name: "Energy level",     category: "Extraversion", description: "The tendency to be fast paced, vigorous and energetic, characterized by an involvement in multiple activities simultaneously." },
  { code: "E5", name: "Risk taking",      category: "Extraversion", description: "A risk-taking tendency often reflected in entrepreneurship skills, high level of stimulation and exploratory behaviour with limited information available." },
  { code: "E6", name: "Positive emotion", category: "Extraversion", description: "The tendency to experience positive feelings like happiness, enthusiasm, optimism and joy." },

  // Agreeableness
  { code: "A1", name: "Trust",                category: "Agreeableness", description: "The tendency to believe that most people are honest and trustworthy, and to believe in the principle of 'forgive and forget'." },
  { code: "A2", name: "Straightforwardness",  category: "Agreeableness", description: "The tendency to be candid, frank, genuine, and non-manipulative." },
  { code: "A3", name: "Altruism",             category: "Agreeableness", description: "The tendency to be concerned for the welfare of others, deriving self-fulfilment from it and to respond to others in a non-judgmental manner." },
  { code: "A4", name: "Compliance",           category: "Agreeableness", description: "The tendency to wilfully compromise or deny one's own needs to get along with the authority and others, reflected in a supportive and collaborative tendency to work towards the goal of the group rather than the individual." },
  { code: "A5", name: "Modesty",              category: "Agreeableness", description: "A measure of tendency of self-efficacy and humbleness and to play down one's achievements, without hampering one's self-confidence and self-esteem." },
  { code: "A6", name: "Sympathy",             category: "Agreeableness", description: "The tendency to express compassion and sensitivity towards others' feelings and to be emotionally supportive of others in need." },

  // Conscientiousness
  { code: "C1", name: "Competence",            category: "Conscientiousness", description: "Level of confidence in his or her ability to accomplish tasks, with a sense of self-efficacy, a desire to do better than others, and seeking pleasure by working in a competitive environment." },
  { code: "C2", name: "Orderliness",           category: "Conscientiousness", description: "The tendency to be well organized, thorough, meticulous and clear in one's approach to work." },
  { code: "C3", name: "Dutifulness",           category: "Conscientiousness", description: "The tendency to have a sense of moral obligation and dutifulness, and practicing of good business ethics, and adhering to a set of commonly held societal laws." },
  { code: "C4", name: "Achievement striving",  category: "Conscientiousness", description: "The tendency to strive towards achieving well-defined, personally meaningful goals, being self-motivated and deriving self-satisfaction on accomplishment of the goal." },
  { code: "C5", name: "Self-discipline",       category: "Conscientiousness", description: "The tendency to persist at difficult or unpleasant tasks until they are completed, by analytically understanding the ambiguity and focusing objectively on the most suitable approach." },
  { code: "C6", name: "Deliberation",          category: "Conscientiousness", description: "The tendency or disposition to think carefully through the possibilities of any situation before action." },

  // Openness to experience
  { code: "O1", name: "Creativity",        category: "Openness to experience", description: "The tendency to use fantasy or imagination to produce unique and original ideas, by being inventive, imaginative, and expressing ideas through original and unique output." },
  { code: "O2", name: "Artistic interests",category: "Openness to experience", description: "The tendency to get involved and engrossed in artistic and natural beauty and related events, and being highly appreciative of art and beauty." },
  { code: "O3", name: "Actions",           category: "Openness to experience", description: "The tendency to experience diversity in work, with a willingness to adjust to constraints and adversity, and demonstrating versatility in handling diverse people and situations." },
  { code: "O4", name: "Feelings",          category: "Openness to experience", description: "The tendency to understand the emotions of others and recognize one's own feelings and emotions, with a desire to understand how others might act based on their intentions and motivations." },
  { code: "O5", name: "Values",            category: "Openness to experience", description: "The tendency to accept and respect the individual differences of people and a desire to understand different cultures and belief systems." },
  { code: "O6", name: "Curiosity",         category: "Openness to experience", description: "The tendency to have intellectual and artistic interests and novelty-seeking." },

  // Emotional stability
  { code: "ES1", name: "Self regard",       category: "Emotional stability", description: "The tendency of self-acceptance, to have feelings of security, self-assuredness, and self-adequacy, and not being bothered by what others think of oneself." },
  { code: "ES2", name: "Impulse control",   category: "Emotional stability", description: "The tendency to resist or delay an impulse or drive to act, and being composed in adverse situations and showing responsible behavior." },
  { code: "ES3", name: "Stress resilience", category: "Emotional stability", description: "The tendency to withstand and deal with crisis and stressful situations without getting overwhelmed, by actively and positively coping with stress." },
  { code: "ES4", name: "Emotional control", category: "Emotional stability", description: "The ability to understand, express, and control one's emotions in a balanced and adaptive manner." },
  { code: "ES5", name: "Happiness",         category: "Emotional stability", description: "The tendency to feel content with oneself, others and life; to feel good and at ease in both work and leisure and to react to life's ups and downs in positive ways." },
  { code: "ES6", name: "Optimism",          category: "Emotional stability", description: "The tendency to be optimistic about one's situation and to not feel anxious, nervous or unpleasant without a reason." },
];

const COMPETENCIES = [
  {
    name: "Drive & Execution",
    description: "Striving to achieve goals with energy, discipline and follow-through.",
    attributeCodes: ["C4", "C5", "C3", "C1", "E4"], // Achievement striving, Self-discipline, Dutifulness, Competence, Energy level
  },
  {
    name: "Communication & Influence",
    description: "Expressing ideas clearly, building rapport, and influencing others positively.",
    attributeCodes: ["E1", "E3", "E2", "A2", "E6"], // Sociability, Assertiveness, Warmth, Straightforwardness, Positive emotion
  },
  {
    name: "Collaboration & Empathy",
    description: "Working cooperatively with others and demonstrating genuine care for people.",
    attributeCodes: ["A1", "A3", "A4", "A6", "O4"], // Trust, Altruism, Compliance, Sympathy, Feelings
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "techgrah-demo" } });
  if (!tenant) throw new Error("Tenant 'techgrah-demo' not found. Run the main seed first.");

  const tenantId = tenant.id;
  console.log(`Using tenant: ${tenant.name} (${tenantId})`);

  // Skip codes that already exist
  const existing = await prisma.attribute.findMany({ where: { tenantId }, select: { code: true } });
  const existingCodes = new Set(existing.map((a) => a.code));

  // ── 1. Attributes ────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  for (const attr of ATTRIBUTES) {
    if (existingCodes.has(attr.code)) {
      console.log(`  SKIP attribute ${attr.code} (${attr.name}) — already exists`);
      skipped++;
      continue;
    }
    await prisma.attribute.create({
      data: { tenantId, code: attr.code, name: attr.name, category: attr.category, description: attr.description },
    });
    console.log(`  + attribute ${attr.code}: ${attr.name}`);
    created++;
  }
  console.log(`\nAttributes: ${created} created, ${skipped} skipped`);

  // Build a lookup map: attribute name → id
  const allAttrs = await prisma.attribute.findMany({ where: { tenantId } });
  const attrByCode = new Map(allAttrs.map((a) => [a.code, a]));

  // ── 2. Competencies ──────────────────────────────────────────────────────
  let compCreated = 0;
  for (const comp of COMPETENCIES) {
    const existing = await prisma.competency.findFirst({ where: { tenantId, name: comp.name } });
    if (existing) {
      console.log(`  SKIP competency "${comp.name}" — already exists`);
      continue;
    }
    const created = await prisma.competency.create({
      data: { tenantId, name: comp.name, description: comp.description },
    });
    console.log(`  + competency: ${comp.name}`);
    compCreated++;

    // ── 3. Attribute–Competency mappings ─────────────────────────────────
    for (const code of comp.attributeCodes) {
      const attr = attrByCode.get(code);
      if (!attr) { console.warn(`    ⚠ attribute code ${code} not found, skipping mapping`); continue; }
      await prisma.attributeCompetencyMap.create({
        data: { attributeId: attr.id, competencyId: created.id },
      });
      console.log(`    mapped: ${attr.name} → ${comp.name}`);
    }
  }
  console.log(`\nCompetencies: ${compCreated} created`);
  console.log("\n✅ Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
