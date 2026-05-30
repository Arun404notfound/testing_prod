import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { unauthorizedIfNotAdmin } from "@/lib/auth/require-admin-api";
import { createCandidateWithLoginUser } from "@/lib/candidate-user";

export const runtime = "nodejs";

export async function GET() {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;
  const tenantId = await getDefaultTenantId();
  const candidates = await prisma.candidate.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(candidates);
}

export async function POST(request: Request) {
  const denied = await unauthorizedIfNotAdmin();
  if (denied) return denied;
  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    mobile?: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    location?: string;
  };

  const requiredFields: Array<keyof typeof body> = [
    "fullName",
    "email",
    "mobile",
    "employeeId",
    "designation",
    "department",
    "location",
  ];

  const missing = requiredFields.find((field) => !body[field]?.trim());
  if (missing) {
    return NextResponse.json(
      { error: `Missing required field: ${missing}` },
      { status: 400 },
    );
  }

  const tenantId = await getDefaultTenantId();
  const result = await createCandidateWithLoginUser({
    tenantId,
    fullName: body.fullName!.trim(),
    email: body.email!.trim(),
    mobile: body.mobile!.trim(),
    employeeId: body.employeeId!.trim(),
    designation: body.designation!.trim(),
    department: body.department!.trim(),
    location: body.location!.trim(),
  });

  if (!result.ok) {
    const status =
      result.error === "email_in_use_non_candidate"
        ? 409
        : result.error === "email_linked_other_candidate"
          ? 409
          : 400;
    const message =
      result.error === "email_in_use_non_candidate"
        ? "Email already used by a non-candidate user"
        : result.error === "email_linked_other_candidate"
          ? "Email already linked to another candidate"
          : "Could not create candidate";
    return NextResponse.json({ error: message }, { status });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: result.candidateId },
  });
  return NextResponse.json(candidate, { status: 201 });
}
