import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";

export const runtime = "nodejs";

export async function GET() {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;
  const tenantId = await getDefaultTenantId();
  const questions = await prisma.question.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(questions);
}

export async function POST(request: Request) {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;
  const body = (await request.json()) as {
    section?: string;
    category?: string;
    questionText?: string;
    option1?: string;
    option2?: string;
    option3?: string;
    option4?: string;
    correctOption?: number | string;
    explanation?: string;
  };

  const requiredFields: Array<keyof typeof body> = [
    "section",
    "category",
    "questionText",
    "option1",
    "option2",
    "option3",
    "option4",
    "correctOption",
    "explanation",
  ];

  const missing = requiredFields.find((field) => !String(body[field] ?? "").trim());
  if (missing) {
    return NextResponse.json(
      { error: `Missing required field: ${missing}` },
      { status: 400 },
    );
  }

  const correctOption = Number(body.correctOption);
  if (!Number.isInteger(correctOption) || correctOption < 1 || correctOption > 4) {
    return NextResponse.json(
      { error: "correctOption must be an integer between 1 and 4" },
      { status: 400 },
    );
  }

  const tenantId = await getDefaultTenantId();
  const question = await prisma.question.create({
    data: {
      tenantId,
      section: body.section!.trim(),
      category: body.category!.trim(),
      questionText: body.questionText!.trim(),
      option1: body.option1!.trim(),
      option2: body.option2!.trim(),
      option3: body.option3!.trim(),
      option4: body.option4!.trim(),
      correctOption,
      explanation: body.explanation!.trim(),
    },
  });

  return NextResponse.json(question, { status: 201 });
}
