/**
 * Seeds a complete Big Five Likert assessment with:
 *  - 1 Likert item per attribute (30 items total)
 *  - Assigned to Alex Chen
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "techgrah-demo" } });
  if (!tenant) throw new Error("Tenant not found");

  const candidate = await prisma.candidate.findFirst({ where: { email: "alex.chen@example.com" } });
  if (!candidate) throw new Error("Candidate alex.chen not found");

  // Delete existing assessment if re-running
  const existing = await prisma.assessment.findFirst({
    where: { tenantId: tenant.id, title: "Big Five Personality Assessment" },
  });
  if (existing) {
    await prisma.assessmentAssignment.deleteMany({ where: { assessmentId: existing.id } });
    await prisma.assessment.delete({ where: { id: existing.id } });
    console.log("Deleted previous assessment");
  }

  // 30 attributes with their Big Five factor and polarity
  const ITEMS: { trait: string; factor: string; prompt: string; polarity: "POSITIVE" | "NEGATIVE" }[] = [
    // Extraversion
    { factor: "Extraversion", trait: "Sociability",      polarity: "POSITIVE", prompt: "I enjoy being around people and thrive in social situations." },
    { factor: "Extraversion", trait: "Warmth",           polarity: "POSITIVE", prompt: "I genuinely like people and find it easy to express positive emotions." },
    { factor: "Extraversion", trait: "Assertiveness",    polarity: "POSITIVE", prompt: "I naturally take the lead and influence the direction of group activities." },
    { factor: "Extraversion", trait: "Energy level",     polarity: "POSITIVE", prompt: "I am fast-paced and energetic, often juggling multiple activities at once." },
    { factor: "Extraversion", trait: "Risk taking",      polarity: "POSITIVE", prompt: "I am comfortable making decisions and taking action with limited information." },
    { factor: "Extraversion", trait: "Positive emotion", polarity: "POSITIVE", prompt: "I frequently experience feelings of happiness, enthusiasm, and optimism." },
    // Agreeableness
    { factor: "Agreeableness", trait: "Trust",               polarity: "POSITIVE", prompt: "I believe most people have good intentions and can be trusted." },
    { factor: "Agreeableness", trait: "Straightforwardness", polarity: "POSITIVE", prompt: "I say what I mean honestly and directly, without hidden agendas." },
    { factor: "Agreeableness", trait: "Altruism",            polarity: "POSITIVE", prompt: "I actively look for ways to help others and derive satisfaction from doing so." },
    { factor: "Agreeableness", trait: "Compliance",          polarity: "POSITIVE", prompt: "I prefer to cooperate and accommodate others rather than insist on my own way." },
    { factor: "Agreeableness", trait: "Modesty",             polarity: "POSITIVE", prompt: "I prefer not to boast about my accomplishments even when I am proud of them." },
    { factor: "Agreeableness", trait: "Sympathy",            polarity: "POSITIVE", prompt: "I feel genuine concern for people who are struggling and try to support them." },
    // Conscientiousness
    { factor: "Conscientiousness", trait: "Competence",           polarity: "POSITIVE", prompt: "I feel confident in my ability to get things done effectively." },
    { factor: "Conscientiousness", trait: "Orderliness",          polarity: "POSITIVE", prompt: "I keep my workspace and tasks well-organised and follow a clear structure." },
    { factor: "Conscientiousness", trait: "Dutifulness",          polarity: "POSITIVE", prompt: "I take my responsibilities seriously and always follow through on commitments." },
    { factor: "Conscientiousness", trait: "Achievement striving", polarity: "POSITIVE", prompt: "I set ambitious personal goals and work hard until I achieve them." },
    { factor: "Conscientiousness", trait: "Self-discipline",      polarity: "POSITIVE", prompt: "I persist with difficult tasks even when I feel like giving up." },
    { factor: "Conscientiousness", trait: "Deliberation",         polarity: "POSITIVE", prompt: "I think carefully through consequences before making important decisions." },
    // Openness to experience
    { factor: "Openness to experience", trait: "Creativity",         polarity: "POSITIVE", prompt: "I regularly generate original ideas and enjoy creative problem solving." },
    { factor: "Openness to experience", trait: "Artistic interests", polarity: "POSITIVE", prompt: "I have a deep appreciation for art, music, and aesthetic beauty." },
    { factor: "Openness to experience", trait: "Actions",            polarity: "POSITIVE", prompt: "I enjoy variety and adapt easily when faced with new or unexpected situations." },
    { factor: "Openness to experience", trait: "Feelings",          polarity: "POSITIVE", prompt: "I am highly aware of my own emotions and sensitive to the feelings of others." },
    { factor: "Openness to experience", trait: "Values",            polarity: "POSITIVE", prompt: "I actively seek to understand and respect people from different backgrounds." },
    { factor: "Openness to experience", trait: "Curiosity",         polarity: "POSITIVE", prompt: "I love learning new things and exploring ideas outside my usual areas of expertise." },
    // Emotional stability
    { factor: "Emotional stability", trait: "Self regard",       polarity: "POSITIVE", prompt: "I feel comfortable with who I am and am not easily unsettled by others' opinions." },
    { factor: "Emotional stability", trait: "Impulse control",   polarity: "POSITIVE", prompt: "I stay calm and composed under pressure rather than reacting impulsively." },
    { factor: "Emotional stability", trait: "Stress resilience", polarity: "POSITIVE", prompt: "I bounce back quickly from setbacks and handle stressful situations effectively." },
    { factor: "Emotional stability", trait: "Emotional control", polarity: "POSITIVE", prompt: "I can manage and express my emotions in a balanced way even in difficult moments." },
    { factor: "Emotional stability", trait: "Happiness",         polarity: "POSITIVE", prompt: "I generally feel content and satisfied with both my work and personal life." },
    { factor: "Emotional stability", trait: "Optimism",          polarity: "POSITIVE", prompt: "I tend to expect positive outcomes and rarely worry without a specific reason." },
  ];

  // Create assessment
  const assessment = await prisma.assessment.create({
    data: {
      tenantId: tenant.id,
      title: "Big Five Personality Assessment",
      description: "Measures 30 Big Five personality attributes using a 5-point Likert scale.",
      assessmentType: "LIKERT_PSYCHOMETRIC",
      reportTemplateType: "PSYCHOMETRIC_TRAIT_REPORT",
      durationMinutes: 30,
      maxAttempts: 1,
      lifecycleStatus: "published",
      isActive: true,
    },
  });
  console.log("Created assessment:", assessment.id);

  // Create one section
  const section = await prisma.assessmentSection.create({
    data: {
      assessmentId: assessment.id,
      title: "Personality Traits",
      displayOrder: 0,
    },
  });

  // Create 30 Likert items (one per attribute)
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    await prisma.assessmentItem.create({
      data: {
        assessmentId: assessment.id,
        sectionId: section.id,
        itemType: "LIKERT",
        prompt: item.prompt,
        factor: item.factor,
        trait: item.trait,
        polarity: item.polarity,
        displayOrder: i,
      },
    });
  }
  console.log(`Created ${ITEMS.length} Likert items`);

  // Assign to Alex Chen
  await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate.id,
      assessmentId: assessment.id,
      accessToken: randomBytes(24).toString("base64url"),
      status: "assigned",
    },
  });
  console.log("Assigned to Alex Chen (alex.chen@example.com)");
  console.log("\n✅ Done! Assessment ID:", assessment.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
