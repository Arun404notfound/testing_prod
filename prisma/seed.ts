import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const sqliteUrl = databaseUrl.startsWith("file:")
  ? databaseUrl.slice("file:".length)
  : databaseUrl;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: sqliteUrl }),
});


const likertItems = [
  {
    prompt: "I stay calm when a customer strongly disagrees with me.",
    factor: "Emotional Stability",
    trait: "Composure",
    definition: "Maintains steady behavior under pressure.",
    polarity: "POSITIVE" as const,
  },
  {
    prompt: "I avoid following up when a prospect has not responded.",
    factor: "Sales Drive",
    trait: "Persistence",
    definition: "Continues constructive follow-up despite slow responses.",
    polarity: "NEGATIVE" as const,
  },
  {
    prompt: "I enjoy explaining product value in a structured way.",
    factor: "Consultative Selling",
    trait: "Value Communication",
    definition: "Connects features to customer needs and business outcomes.",
    polarity: "POSITIVE" as const,
  },
  {
    prompt: "I get impatient when customers ask repeated questions.",
    factor: "Customer Orientation",
    trait: "Patience",
    definition: "Responds consistently and respectfully to customer concerns.",
    polarity: "NEGATIVE" as const,
  },
];

const triadGroups = [
  {
    title: "Customer Interaction Style",
    statements: [
      {
        statementText: "I ask probing questions before recommending a product.",
        factor: "Consultative Selling",
        trait: "Needs Discovery",
        definition: "Understands requirements before positioning a solution.",
        polarity: "POSITIVE" as const,
      },
      {
        statementText: "I prefer to close quickly even if some doubts remain.",
        factor: "Customer Orientation",
        trait: "Decision Pressure",
        definition: "Uses pressure instead of resolving concerns.",
        polarity: "NEGATIVE" as const,
      },
      {
        statementText: "I explain the long-term value of premium products.",
        factor: "Sales Drive",
        trait: "Value Selling",
        definition: "Frames premium pricing through long-term customer value.",
        polarity: "POSITIVE" as const,
      },
    ],
  },
  {
    title: "Dealer Relationship Style",
    statements: [
      {
        statementText: "I prepare evidence before discussing objections.",
        factor: "Execution Discipline",
        trait: "Preparation",
        definition: "Uses facts and planning before important conversations.",
        polarity: "POSITIVE" as const,
      },
      {
        statementText: "I drop difficult dealer conversations when they become uncomfortable.",
        factor: "Sales Drive",
        trait: "Persistence",
        definition: "Sustains progress through commercial friction.",
        polarity: "NEGATIVE" as const,
      },
      {
        statementText: "I align dealer priorities with customer demand signals.",
        factor: "Market Orientation",
        trait: "Channel Insight",
        definition: "Connects channel action to market context.",
        polarity: "POSITIVE" as const,
      },
    ],
  },
];


async function resetData() {
  await prisma.importRowError.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.questionResponse.deleteMany();
  await prisma.sectionScore.deleteMany();
  await prisma.traitScore.deleteMany();
  await prisma.attemptScore.deleteMany();
  await prisma.attemptResponse.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessmentAssignment.deleteMany();
  await prisma.triadStatement.deleteMany();
  await prisma.triadGroup.deleteMany();
  await prisma.itemOption.deleteMany();
  await prisma.assessmentItem.deleteMany();
  await prisma.assessmentSection.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessmentCompositionItem.deleteMany();
  await prisma.question.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.reportTemplate.deleteMany();
  await prisma.likertScale.deleteMany();
  await prisma.user.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.tenant.deleteMany();
}

async function main() {
  await resetData();

  const tenant = await prisma.tenant.create({
    data: {
      name: "TechGrah Demo Client",
      slug: "techgrah-demo",
      logoUrl: null,
      primaryColor: "#1f2937",
      secondaryColor: "#4b5563",
      accentColor: "#1d4ed8",
      disclaimerText: null,
    },
  });

  const reportTemplates = await Promise.all([
    prisma.reportTemplate.create({
      data: {
        tenantId: tenant.id,
        name: "Psychometric Report",
        assessmentType: "LIKERT_PSYCHOMETRIC",
        headerTitle: "Psychometric Assessment Report",
        introduction: "Summarizes factor and trait scores.",
        footerText: "Generated by TechGrah Assessment Portal.",
      },
    }),
    prisma.reportTemplate.create({
      data: {
        tenantId: tenant.id,
        name: "Forced Choice Report",
        assessmentType: "FORCED_CHOICE_TRIAD",
        headerTitle: "Forced Choice Assessment Report",
        introduction: "Summarizes ipsative triad response patterns.",
        footerText: "Generated by TechGrah Assessment Portal.",
      },
    }),
    prisma.reportTemplate.create({
      data: {
        tenantId: tenant.id,
        name: "Hybrid Report",
        assessmentType: "HYBRID",
        headerTitle: "Hybrid Assessment Report",
        introduction: "Summarizes combined knowledge and psychometric signals.",
        footerText: "Generated by TechGrah Assessment Portal.",
      },
    }),
  ]);
  const likertTemplate = reportTemplates[0]!;
  const triadTemplate = reportTemplates[1]!;

  const [candidate1, candidate2, candidate3] = await prisma.$transaction([
    prisma.candidate.create({
      data: {
        tenantId: tenant.id,
        fullName: "Priya Sharma",
        email: "priya.sharma@example.com",
        mobile: "+91 98765 43210",
        employeeId: "EMP-1001",
        designation: "Sales Executive",
        department: "Sales",
        location: "Bengaluru",
      },
    }),
    prisma.candidate.create({
      data: {
        tenantId: tenant.id,
        fullName: "Alex Chen",
        email: "alex.chen@example.com",
        mobile: "+1 415 555 0199",
        employeeId: "EMP-1002",
        designation: "Territory Sales Executive",
        department: "Sales",
        location: "San Francisco",
      },
    }),
    prisma.candidate.create({
      data: {
        tenantId: tenant.id,
        fullName: "Neha Iyer",
        email: "neha.iyer@example.com",
        mobile: "+91 99887 76655",
        employeeId: "EMP-1003",
        designation: "Sales Trainee",
        department: "Sales",
        location: "Mumbai",
      },
    }),
  ]);

  const likertScale = await prisma.likertScale.create({
    data: {
      name: "Agreement 1-5",
      minValue: 1,
      maxValue: 5,
      minLabel: "Strongly disagree",
      maxLabel: "Strongly agree",
    },
  });

  const likertAssessment = await prisma.assessment.create({
    data: {
      tenantId: tenant.id,
      reportTemplateId: likertTemplate.id,
      reportTemplateType: "PSYCHOMETRIC_TRAIT_REPORT",
      title: "Sales Behavioral Profile",
      description: "Sample Likert psychometric assessment with polarity-aware scoring.",
      assessmentType: "LIKERT_PSYCHOMETRIC",
      durationMinutes: 20,
      maxAttempts: 1,
      lifecycleStatus: "published",
    },
  });

  const likertSection = await prisma.assessmentSection.create({
    data: {
      assessmentId: likertAssessment.id,
      title: "Sales Work Style",
      description: "Self-rating items mapped to factors and traits.",
      displayOrder: 1,
    },
  });

  const likertAssessmentItems = await Promise.all(
    likertItems.map((item, index) =>
      prisma.assessmentItem.create({
        data: {
          assessmentId: likertAssessment.id,
          sectionId: likertSection.id,
          itemType: "LIKERT",
          prompt: item.prompt,
          displayOrder: index + 1,
          factor: item.factor,
          trait: item.trait,
          definition: item.definition,
          polarity: item.polarity,
          likertScaleId: likertScale.id,
        },
      }),
    ),
  );

  const likertAssignment = await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate3.id,
      assessmentId: likertAssessment.id,
      status: "assigned",
    },
  });

  const likertAttempt = await prisma.assessmentAttempt.create({
    data: {
      assignmentId: likertAssignment.id,
      candidateId: candidate3.id,
      assessmentId: likertAssessment.id,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      responses: {
        create: likertAssessmentItems.slice(0, 2).map((item, index) => {
          const numericValue = index === 0 ? 5 : 2;
          const scoredValue =
            item.polarity === "NEGATIVE" ? 6 - numericValue : numericValue;

          return {
            itemId: item.id,
            status: "ANSWERED",
            numericValue,
            rawScore: numericValue,
            scoredValue,
          };
        }),
      },
    },
  });

  await prisma.traitScore.createMany({
    data: [
      {
        attemptId: likertAttempt.id,
        factor: "Emotional Stability",
        trait: "Composure",
        definition: "Maintains steady behavior under pressure.",
        score: 5,
        maxScore: 5,
        percent: 100,
      },
      {
        attemptId: likertAttempt.id,
        factor: "Sales Drive",
        trait: "Persistence",
        definition: "Continues constructive follow-up despite slow responses.",
        score: 4,
        maxScore: 5,
        percent: 80,
      },
    ],
  });

  const triadAssessment = await prisma.assessment.create({
    data: {
      tenantId: tenant.id,
      reportTemplateId: triadTemplate.id,
      reportTemplateType: "FORCED_CHOICE_REPORT",
      title: "Sales Forced Choice Profile",
      description: "Sample forced-choice triad assessment with most/least scoring.",
      assessmentType: "FORCED_CHOICE_TRIAD",
      durationMinutes: 25,
      maxAttempts: 1,
      lifecycleStatus: "published",
    },
  });

  const triadSection = await prisma.assessmentSection.create({
    data: {
      assessmentId: triadAssessment.id,
      title: "Sales Preferences",
      description: "Triads with exactly three statements per group.",
      displayOrder: 1,
    },
  });

  for (const [groupIndex, group] of triadGroups.entries()) {
    const triadGroup = await prisma.triadGroup.create({
      data: {
        tenantId: tenant.id,
        triadGroupCode: `SEED-TRIAD-${groupIndex + 1}`,
        assessmentId: triadAssessment.id,
        sectionId: triadSection.id,
        title: group.title,
        displayOrder: groupIndex + 1,
        statements: {
          create: group.statements.map((statement, statementIndex) => ({
            statementText: statement.statementText,
            displayOrder: statementIndex + 1,
            factor: statement.factor,
            trait: statement.trait,
            definition: statement.definition,
            polarity: statement.polarity,
          })),
        },
      },
      include: { statements: true },
    });

    if (triadGroup.statements.length !== 3) {
      throw new Error(`Triad group ${triadGroup.title} must contain exactly 3 statements.`);
    }

    if (groupIndex === 0) {
      const most = triadGroup.statements.find((statement) => statement.displayOrder === 1);
      const least = triadGroup.statements.find((statement) => statement.displayOrder === 2);
      const triadAssignment = await prisma.assessmentAssignment.create({
        data: {
          candidateId: candidate1.id,
          assessmentId: triadAssessment.id,
          status: "assigned",
        },
      });

      await prisma.assessmentAttempt.create({
        data: {
          assignmentId: triadAssignment.id,
          candidateId: candidate1.id,
          assessmentId: triadAssessment.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          responses: {
            create: {
              triadGroupId: triadGroup.id,
              triadMostStatementId: most?.id,
              triadLeastStatementId: least?.id,
              status: "ANSWERED",
            },
          },
        },
      });
    }
  }

  const demoPassword = await bcrypt.hash("demo1234", 10);

  for (const c of [candidate1, candidate2, candidate3]) {
    const email = c.email.trim().toLowerCase();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: demoPassword,
        role: "CANDIDATE",
        tenantId: tenant.id,
      },
    });
    await prisma.candidate.update({
      where: { id: c.id },
      data: { userId: user.id },
    });
  }

  await prisma.user.create({
    data: {
      email: "admin@demo.local",
      passwordHash: demoPassword,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "super@demo.local",
      passwordHash: demoPassword,
      role: "SUPER_ADMIN",
      tenantId: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "system",
      action: "seed",
      entityType: "database",
      message: "Seeded Likert and triad assessment samples.",
    },
  });

  console.log("Seed complete", {
    tenantId: tenant.id,
    candidates: [candidate1.id, candidate2.id, candidate3.id],
    assessments: {
      likert: likertAssessment.id,
      triad: triadAssessment.id,
    },
    authUsers: {
      super: "super@demo.local / demo1234",
      admin: "admin@demo.local / demo1234",
      candidates: "priya.sharma@example.com, alex.chen@example.com, neha.iyer@example.com / demo1234",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
