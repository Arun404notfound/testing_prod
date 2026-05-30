/**
 * clean-for-demo.ts
 *
 * Wipes all junk from the DB and leaves exactly:
 *   Tenant   : TechGrah Demo Client
 *   Users    : alex.chen@example.com (CANDIDATE) + admin@demo.local (ADMIN)
 *   Candidate: Alex Chen
 *   Assessment: "Big Five Psychometric Assessment" (HYBRID, 50 questions)
 *   Assignment: Alex Chen → Big Five (status = assigned, fresh)
 *   Attributes : 30 Big Five attributes (E1–ES6)
 *   Competencies: Drive & Execution, Communication & Influence, Collaboration & Empathy
 *   Mappings : 15 attribute→competency maps
 *
 * Run: npx tsx prisma/clean-for-demo.ts
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

const KEEP_TENANT_SLUG   = "techgrah-demo";
const KEEP_ASSESSMENT    = "Big Five Psychometric Assessment";
const KEEP_CANDIDATE_EMAIL = "alex.chen@example.com";
const KEEP_ADMIN_EMAIL   = "admin@demo.local";

async function main() {
  console.log("🧹 Starting demo database cleanup...\n");

  // ── 1. Find IDs we want to KEEP ───────────────────────────────────────────
  const tenant = await prisma.tenant.findFirst({ where: { slug: KEEP_TENANT_SLUG } });
  if (!tenant) throw new Error("Tenant 'techgrah-demo' not found.");
  console.log(`✅ Keep tenant: ${tenant.name} (${tenant.id})`);

  const assessment = await prisma.assessment.findFirst({
    where: { tenantId: tenant.id, title: KEEP_ASSESSMENT },
  });
  if (!assessment) throw new Error(`Assessment "${KEEP_ASSESSMENT}" not found.`);
  console.log(`✅ Keep assessment: ${assessment.title} (${assessment.id})`);

  const candidateUser = await prisma.user.findUnique({ where: { email: KEEP_CANDIDATE_EMAIL } });
  if (!candidateUser) throw new Error(`User ${KEEP_CANDIDATE_EMAIL} not found.`);
  const candidate = await prisma.candidate.findFirst({ where: { userId: candidateUser.id } });
  if (!candidate) throw new Error("Alex Chen candidate record not found.");
  console.log(`✅ Keep candidate: ${KEEP_CANDIDATE_EMAIL} (candidateId: ${candidate.id})`);

  const adminUser = await prisma.user.findUnique({ where: { email: KEEP_ADMIN_EMAIL } });
  if (!adminUser) throw new Error(`User ${KEEP_ADMIN_EMAIL} not found.`);
  console.log(`✅ Keep admin: ${KEEP_ADMIN_EMAIL}\n`);

  // ── 2. Delete ALL attempt/result data ────────────────────────────────────
  console.log("🗑  Deleting all attempt responses...");
  await prisma.attemptResponse.deleteMany({});

  console.log("🗑  Deleting all competency scores...");
  await prisma.competencyScore.deleteMany({});

  console.log("🗑  Deleting all trait scores...");
  await prisma.traitScore.deleteMany({});

  console.log("🗑  Deleting all section scores...");
  await prisma.sectionScore.deleteMany({});

  console.log("🗑  Deleting all question responses...");
  await prisma.questionResponse.deleteMany({});

  console.log("🗑  Deleting all assessment results...");
  await prisma.assessmentResult.deleteMany({});

  console.log("🗑  Deleting all assessment attempts...");
  await prisma.assessmentAttempt.deleteMany({});

  // ── 3. Delete ALL assignments, then re-create the one we need ─────────────
  console.log("🗑  Deleting all assignments...");
  await prisma.assessmentAssignment.deleteMany({});

  // ── 4. Delete all assessments EXCEPT the one we keep ─────────────────────
  const otherAssessments = await prisma.assessment.findMany({
    where: { id: { not: assessment.id } },
    select: { id: true, title: true },
  });
  console.log(`\n🗑  Deleting ${otherAssessments.length} junk assessments:`);
  for (const a of otherAssessments) {
    console.log(`   - ${a.title}`);
    // Composition items first (FK chain)
    await prisma.assessmentCompositionItem.deleteMany({ where: { assessmentId: a.id } });
    // Item options
    const items = await prisma.assessmentItem.findMany({ where: { assessmentId: a.id }, select: { id: true } });
    for (const item of items) {
      await prisma.itemOption.deleteMany({ where: { itemId: item.id } });
    }
    await prisma.assessmentItem.deleteMany({ where: { assessmentId: a.id } });
    // Triad statements → groups
    const groups = await prisma.triadGroup.findMany({ where: { assessmentId: a.id }, select: { id: true } });
    for (const g of groups) {
      await prisma.triadStatement.deleteMany({ where: { triadGroupId: g.id } });
    }
    await prisma.triadGroup.deleteMany({ where: { assessmentId: a.id } });
    await prisma.assessmentSection.deleteMany({ where: { assessmentId: a.id } });
    await prisma.assessment.delete({ where: { id: a.id } });
  }

  // ── 5. Delete legacy questions ─────────────────────────────────────────────
  const legacyQCount = await prisma.question.count();
  console.log(`\n🗑  Deleting ${legacyQCount} legacy MCQ questions...`);
  await prisma.question.deleteMany({});

  // ── 6. Delete junk competency "d" ─────────────────────────────────────────
  const junkComps = await prisma.competency.findMany({
    where: {
      name: { notIn: ["Drive & Execution", "Communication & Influence", "Collaboration & Empathy"] },
    },
    select: { id: true, name: true },
  });
  if (junkComps.length > 0) {
    console.log(`\n🗑  Deleting ${junkComps.length} junk competencies: ${junkComps.map(c => c.name).join(", ")}`);
    await prisma.attributeCompetencyMap.deleteMany({
      where: { competencyId: { in: junkComps.map(c => c.id) } },
    });
    await prisma.competency.deleteMany({
      where: { id: { in: junkComps.map(c => c.id) } },
    });
  }

  // ── 7. Delete junk attribute (code "D", name "s") ─────────────────────────
  const validCodes = ["E1","E2","E3","E4","E5","E6","A1","A2","A3","A4","A5","A6","C1","C2","C3","C4","C5","C6","O1","O2","O3","O4","O5","O6","ES1","ES2","ES3","ES4","ES5","ES6"];
  const junkAttrs = await prisma.attribute.findMany({
    where: { code: { notIn: validCodes } },
    select: { id: true, code: true, name: true },
  });
  if (junkAttrs.length > 0) {
    console.log(`\n🗑  Deleting ${junkAttrs.length} junk attributes: ${junkAttrs.map(a => a.code).join(", ")}`);
    await prisma.attributeCompetencyMap.deleteMany({
      where: { attributeId: { in: junkAttrs.map(a => a.id) } },
    });
    await prisma.attribute.deleteMany({
      where: { id: { in: junkAttrs.map(a => a.id) } },
    });
  }

  // ── 8. Delete extra candidates & users ────────────────────────────────────
  const extraCandidates = await prisma.candidate.findMany({
    where: { id: { not: candidate.id } },
    select: { id: true, userId: true },
  });
  console.log(`\n🗑  Deleting ${extraCandidates.length} extra candidates...`);
  await prisma.candidate.deleteMany({
    where: { id: { in: extraCandidates.map(c => c.id) } },
  });

  const extraUsers = await prisma.user.findMany({
    where: {
      email: { notIn: [KEEP_CANDIDATE_EMAIL, KEEP_ADMIN_EMAIL] },
    },
    select: { id: true, email: true },
  });
  console.log(`🗑  Deleting ${extraUsers.length} extra users: ${extraUsers.map(u => u.email).join(", ")}`);
  await prisma.user.deleteMany({
    where: { id: { in: extraUsers.map(u => u.id) } },
  });

  // ── 9. Delete extra tenant ────────────────────────────────────────────────
  const extraTenants = await prisma.tenant.findMany({
    where: { id: { not: tenant.id } },
    select: { id: true, name: true },
  });
  if (extraTenants.length > 0) {
    console.log(`\n🗑  Deleting ${extraTenants.length} extra tenants: ${extraTenants.map(t => t.name).join(", ")}`);
    await prisma.tenant.deleteMany({
      where: { id: { in: extraTenants.map(t => t.id) } },
    });
  }

  // ── 10. Re-create Alex Chen's assignment (fresh, status = assigned) ───────
  console.log("\n✨ Creating fresh assignment for Alex Chen...");
  const newAssignment = await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate.id,
      assessmentId: assessment.id,
      status: "assigned",
    },
  });
  console.log(`✅ Assignment created: ${newAssignment.id}`);

  // ── 11. Final count ───────────────────────────────────────────────────────
  console.log("\n📊 Final database state:");
  const counts = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.assessment.count(),
    prisma.assessmentAssignment.count(),
    prisma.assessmentItem.count(),
    prisma.triadGroup.count(),
    prisma.triadStatement.count(),
    prisma.attribute.count(),
    prisma.competency.count(),
    prisma.attributeCompetencyMap.count(),
    prisma.assessmentResult.count(),
    prisma.assessmentAttempt.count(),
  ]);

  const labels = ["Tenants","Users","Candidates","Assessments","Assignments","Likert Items","Triad Groups","Triad Statements","Attributes","Competencies","Mappings","Results","Attempts"];
  labels.forEach((l, i) => console.log(`   ${l}: ${counts[i]}`));

  console.log("\n🎉 Database is clean and ready for demo!");
  console.log(`\n   Login as candidate : alex.chen@example.com / demo1234`);
  console.log(`   Login as admin     : admin@demo.local / demo1234`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
