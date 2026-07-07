import { prisma } from "@/lib/prisma";

export type CreateCandidateInput = {
  tenantId: string | null;
  fullName: string;
  email: string;
  mobile: string;
  employeeId: string;
  designation: string;
  department: string;
  location: string;
  batchName?: string | null;
};

export type CreateCandidateResult = { ok: true; candidateId: string } | { ok: false; error: "db" };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createCandidate(input: CreateCandidateInput): Promise<CreateCandidateResult> {
  try {
    const candidate = await prisma.candidate.create({
      data: {
        tenantId: input.tenantId,
        fullName: input.fullName.trim(),
        email: normalizeEmail(input.email),
        mobile: input.mobile.trim(),
        employeeId: input.employeeId.trim(),
        designation: input.designation.trim(),
        department: input.department.trim(),
        location: input.location.trim(),
        batchName: input.batchName ?? null,
      },
    });
    return { ok: true, candidateId: candidate.id };
  } catch {
    return { ok: false, error: "db" };
  }
}
