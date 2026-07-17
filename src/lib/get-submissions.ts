import { prisma } from "@/lib/prisma";

export async function getSubmissions(resultId: string, tenantId?: string) {
  const result = await prisma.assessmentResult.findFirst({
    where: {
      id: resultId,
      ...(tenantId ? { candidate: { tenantId } } : {}),
    },
    include: {
      candidate: {
        select: {
          fullName: true,
          email: true,
          employeeId: true,
          designation: true,
          batchName: true,
        },
      },
      assessment: {
        select: {
          title: true,
          assessmentType: true,
          jobRoleId: true,
          jobRole: { select: { name: true } },
          // Legacy MCQ questions (junction table)
          questions: {
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  option1: true,
                  option2: true,
                  option3: true,
                  option4: true,
                  correctOption: true,
                },
              },
            },
          },
          // Direct likert items owned by this assessment
          items: {
            select: { id: true, displayOrder: true, prompt: true, itemType: true, factor: true, trait: true, polarity: true },
            orderBy: { displayOrder: "asc" },
          },
          // Direct triad groups owned by this assessment
          triadGroups: {
            select: {
              id: true,
              title: true,
              displayOrder: true,
              statements: { select: { id: true, factor: true, trait: true, polarity: true } },
            },
            orderBy: { displayOrder: "asc" },
          },
          // Composition items (imported from pool assessments)
          compositionItems: {
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              displayOrder: true,
              sourceItem: {
                select: { id: true, prompt: true, itemType: true, factor: true, trait: true, polarity: true },
              },
              sourceTriad: {
                select: {
                  id: true,
                  title: true,
                  statements: { select: { id: true, factor: true, trait: true, polarity: true } },
                },
              },
            },
          },
        },
      },
      questionResponses: {
        include: {
          question: {
            select: {
              questionText: true,
              option1: true,
              option2: true,
              option3: true,
              option4: true,
              correctOption: true,
            },
          },
        },
      },
    },
  });
  if (!result) return null;

  const attempt = result.assignmentId
    ? await prisma.assessmentAttempt.findFirst({
        where: { assignmentId: result.assignmentId, status: "SCORED" },
        orderBy: { scoredAt: "desc" },
        include: {
          responses: {
            include: {
              item: { select: { id: true, prompt: true, itemType: true, factor: true, trait: true, polarity: true } },
              itemOption: { select: { label: true, value: true } },
              triadGroup: { select: { id: true, title: true } },
              triadMostStatement: { select: { statementText: true, trait: true, factor: true, polarity: true } },
              triadLeastStatement: { select: { statementText: true, trait: true, factor: true, polarity: true } },
            },
          },
        },
      })
    : null;

  return { result, attempt };
}

export type SubmissionsData = NonNullable<Awaited<ReturnType<typeof getSubmissions>>>;
export type AttemptWithResponses = NonNullable<SubmissionsData["attempt"]>;
export type AttemptResponseRow = AttemptWithResponses["responses"][number];
