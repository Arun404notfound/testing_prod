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

const mcqSeed = [
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "What are the key technologies that differentiate Century Ply Club Prime from competitors?",
    "Only BWP grade quality",
    "ViroKill + Firewall Technology + Marine Grade BWP",
    "Lower pricing strategy",
    "Better distribution network",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "Which Century Ply product would you recommend for kitchen cabinets in humid climate?",
    "Sainik 710",
    "Club Prime with ViroKill & Firewall",
    "Regular commercial grade",
    "Particle board alternative",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "How would you explain ViroKill technology to a health-conscious family?",
    "It is an antibacterial coating",
    "It kills 99.9% viruses on contact, thermostable, safe for humans",
    "It is similar to sanitizer coating",
    "It prevents wood damage",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "What warranty does Club Prime offer against borer/termite attacks?",
    "15 years",
    "20 years",
    "25 years",
    "30 years",
    4,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "For a budget-conscious retail customer, how would you position Sainik 710?",
    "It is the cheapest option",
    "BWP grade quality at economy price with national uniform pricing",
    "It is popular in the market",
    "Better than unorganized brands",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "In which application would you NOT recommend plywood?",
    "Kitchen cabinets",
    "Decorative wall panels (recommend laminates instead)",
    "Wardrobe shutters",
    "False ceiling",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "What makes Century Ply BWP grade superior to MR grade?",
    "Only price difference",
    "Marine grade boiling waterproof quality vs moisture resistant",
    "Different color options",
    "Brand positioning only",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "Customer asks about fire safety for a commercial project. What do you highlight?",
    "General wood treatment",
    "Firewall technology slows fire spread, buying evacuation time",
    "All plywood is fire resistant",
    "Focus on other benefits",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "How do you differentiate Club Prime from local unorganized players?",
    "Brand name recognition",
    "30-year warranty + ViroKill + Firewall + Consistent quality",
    "More outlets",
    "Celebrity endorsements",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "What is the key selling point of uniform national pricing for Sainik 710?",
    "Easy to remember prices",
    "Eliminates price arbitrage, ensures fair dealer margins",
    "Competitive advantage",
    "Marketing strategy",
    2,
  ],
  [
    "CenturyPly Product Knowledge",
    "Product Knowledge",
    "Customer says all plywood looks the same, why Century Ply? Your response:",
    "We are a famous brand",
    "Let me show you the quality difference - core density, glue line, finish",
    "Price is competitive",
    "Everyone uses Century Ply",
    2,
  ],
  [
    "SE Selling Skills",
    "Selling Skills",
    "Best approach for needs assessment with a new customer:",
    "Immediately show product catalog",
    "Ask about application, budget, timeline, performance requirements",
    "Focus on best-selling products",
    "Compare with competitors",
    2,
  ],
  [
    "SE Selling Skills",
    "Selling Skills",
    "Customer objects: Club Prime is 30% more expensive than local brands.",
    "Quality costs money",
    "Calculate cost per year for 30 years vs replacement costs",
    "I can give you a discount",
    "Local brands are inferior",
    2,
  ],
  [
    "SE Selling Skills",
    "Selling Skills",
    "How do you handle: I need to think about it?",
    "Apply pressure to decide immediately",
    "What specific concerns can I address? When shall I follow up?",
    "Offer maximum discount",
    "Walk away",
    2,
  ],
  [
    "SE Selling Skills",
    "Selling Skills",
    "Best way to generate new leads:",
    "Cold calling only",
    "Referrals + architect meetings + contractor visits + dealer partnerships",
    "Online advertising only",
    "Wait for inbound inquiries",
    2,
  ],
  [
    "Market Knowledge",
    "Market Knowledge",
    "What percentage of Indian plywood market is unorganized?",
    "50%",
    "60%",
    "70%",
    "80%",
    4,
  ],
  [
    "Market Knowledge",
    "Market Knowledge",
    "Primary buying criteria for architects/contractors:",
    "Price only",
    "Quality certifications + warranty + technical support + reliable supply",
    "Brand recognition",
    "Credit terms",
    2,
  ],
] as const;

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

function incorrectOptionFor(correctOption: number) {
  return correctOption === 1 ? 2 : 1;
}

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
        name: "MCQ Report",
        assessmentType: "KNOWLEDGE_MCQ",
        headerTitle: "Knowledge Assessment Report",
        introduction: "Summarizes section-wise knowledge performance.",
        footerText: "Generated by TechGrah Assessment Portal.",
      },
    }),
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
  const mcqTemplate = reportTemplates[0]!;
  const likertTemplate = reportTemplates[1]!;
  const triadTemplate = reportTemplates[2]!;

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

  const legacyQuestions = await Promise.all(
    mcqSeed.map((q) =>
      prisma.question.create({
        data: {
          tenantId: tenant.id,
          section: q[0],
          category: q[1],
          questionText: q[2],
          option1: q[3],
          option2: q[4],
          option3: q[5],
          option4: q[6],
          correctOption: q[7],
          explanation: "Sample explanation based on sales assessment reference report.",
        },
      }),
    ),
  );

  const mcqAssessment = await prisma.assessment.create({
    data: {
      tenantId: tenant.id,
      reportTemplateId: mcqTemplate.id,
      reportTemplateType: "TECHNICAL_SKILLS_REPORT",
      title: "CenturyPly Sales Executive Assessment",
      description: "Demo technical + selling + market knowledge assessment based on sample report.",
      assessmentType: "KNOWLEDGE_MCQ",
      durationMinutes: 45,
      maxAttempts: 1,
      lifecycleStatus: "published",
      questions: {
        create: legacyQuestions.map((question) => ({ questionId: question.id })),
      },
    },
  });

  const sectionNames = Array.from(new Set(mcqSeed.map((q) => q[0])));
  const mcqSections = await Promise.all(
    sectionNames.map((sectionName, index) =>
      prisma.assessmentSection.create({
        data: {
          assessmentId: mcqAssessment.id,
          title: sectionName,
          description: `Questions for ${sectionName}.`,
          displayOrder: index + 1,
        },
      }),
    ),
  );
  const mcqSectionByTitle = new Map(mcqSections.map((section) => [section.title, section]));
  const getMcqSection = (title: string) => {
    const section = mcqSectionByTitle.get(title);
    if (!section) throw new Error(`Missing MCQ section ${title}`);
    return section;
  };

  const mcqItems = [];
  for (const [index, q] of mcqSeed.entries()) {
    const section = getMcqSection(q[0]);

    const item = await prisma.assessmentItem.create({
      data: {
        assessmentId: mcqAssessment.id,
        sectionId: section.id,
        itemType: "MCQ_SINGLE",
        prompt: q[2],
        helpText: "Select one correct answer.",
        displayOrder: index + 1,
        options: {
          create: [q[3], q[4], q[5], q[6]].map((option, optionIndex) => ({
            label: `Option ${optionIndex + 1}`,
            value: option,
            displayOrder: optionIndex + 1,
            isCorrect: optionIndex + 1 === q[7],
            scoreValue: optionIndex + 1 === q[7] ? 1 : 0,
          })),
        },
      },
      include: { options: true },
    });
    mcqItems.push(item);
  }

  const assignedForCandidate1 = await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate1.id,
      assessmentId: mcqAssessment.id,
      status: "assigned",
    },
  });

  const assignedMcqForNeha = await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate3.id,
      assessmentId: mcqAssessment.id,
      status: "assigned",
    },
  });

  const completedAssignment = await prisma.assessmentAssignment.create({
    data: {
      candidateId: candidate2.id,
      assessmentId: mcqAssessment.id,
      status: "completed",
      completedAt: new Date("2026-04-20T14:30:00.000Z"),
    },
  });

  const mcqAttempt = await prisma.assessmentAttempt.create({
    data: {
      assignmentId: completedAssignment.id,
      candidateId: candidate2.id,
      assessmentId: mcqAssessment.id,
      status: "SCORED",
      startedAt: new Date("2026-04-20T14:00:00.000Z"),
      submittedAt: new Date("2026-04-20T14:30:00.000Z"),
      scoredAt: new Date("2026-04-20T14:30:00.000Z"),
    },
  });

  for (const [index, item] of mcqItems.entries()) {
    const correctOption = item.options.find((option) => option.isCorrect);
    const selectedOption =
      index === 5 || index % 7 === 0
        ? item.options.find((option) => !option.isCorrect)
        : correctOption;

    await prisma.attemptResponse.create({
      data: {
        attemptId: mcqAttempt.id,
        itemId: item.id,
        itemOptionId: selectedOption?.id,
        status: "ANSWERED",
        isCorrect: selectedOption?.isCorrect ?? false,
        rawScore: selectedOption?.isCorrect ? 1 : 0,
        scoredValue: selectedOption?.isCorrect ? 1 : 0,
      },
    });
  }

  await prisma.attemptScore.create({
    data: {
      attemptId: mcqAttempt.id,
      scoreName: "Overall",
      score: 80,
      maxScore: 100,
      percent: 80,
    },
  });

  const result = await prisma.assessmentResult.create({
    data: {
      candidateId: candidate2.id,
      assessmentId: mcqAssessment.id,
      assignmentId: completedAssignment.id,
      assessmentName: mcqAssessment.title,
      completedAt: new Date("2026-04-20T14:30:00.000Z"),
      overallScore: 80,
      strengths: [
        "Strong value-selling narrative for Club Prime and Sainik 710",
        "Good objection handling and consultative probing",
      ],
      areasOfConcern: ["Needs stronger market conversion strategy against local competitors"],
      sectionScores: {
        create: [
          {
            sectionId: getMcqSection("CenturyPly Product Knowledge").id,
            sectionName: "CenturyPly Product Knowledge",
            score: 9,
            maxScore: 11,
            summary: "Strong command over product differentiators and use-case mapping.",
          },
          {
            sectionId: getMcqSection("SE Selling Skills").id,
            sectionName: "SE Selling Skills",
            score: 3,
            maxScore: 4,
            summary: "Good consultative selling approach with effective follow-up intent.",
          },
          {
            sectionId: getMcqSection("Market Knowledge").id,
            sectionName: "Market Knowledge",
            score: 2,
            maxScore: 2,
            summary: "Understands organized vs unorganized market dynamics well.",
          },
        ],
      },
      questionResponses: {
        create: legacyQuestions.map((question, index) => {
          const selectedOption =
            index === 5 || index % 7 === 0
              ? incorrectOptionFor(question.correctOption)
              : question.correctOption;

          return {
            questionId: question.id,
            selectedOption,
            isCorrect: selectedOption === question.correctOption,
          };
        }),
      },
    },
  });

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
      message: "Seeded MCQ, Likert, and triad assessment samples.",
    },
  });

  console.log("Seed complete", {
    tenantId: tenant.id,
    candidates: [candidate1.id, candidate2.id, candidate3.id],
    assessments: {
      mcq: mcqAssessment.id,
      likert: likertAssessment.id,
      triad: triadAssessment.id,
    },
    assignments: [assignedForCandidate1.id, assignedMcqForNeha.id, completedAssignment.id],
    sampleResultId: result.id,
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
