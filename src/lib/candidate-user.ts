import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/generated/prisma/enums";
import { randomBytes } from "node:crypto";

export type CreateCandidateWithLoginInput = {
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

export type CreateCandidateWithLoginResult =
  | { ok: true; candidateId: string }
  | { ok: false; error: "email_in_use_non_candidate" | "email_linked_other_candidate" | "db" };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Creates a Candidate and a CANDIDATE User with matching email, or links to an existing
 * orphaned CANDIDATE user (no profile). Sets password to {@link DEFAULT_CANDIDATE_LOGIN_PASSWORD}.
 */
export async function createCandidateWithLoginUser(
  input: CreateCandidateWithLoginInput,
): Promise<CreateCandidateWithLoginResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { candidateProfile: { select: { id: true } } },
    });

    if (existingUser) {
      if (existingUser.role !== "CANDIDATE") {
        return { ok: false, error: "email_in_use_non_candidate" };
      }
      if (existingUser.candidateProfile) {
        return { ok: false, error: "email_linked_other_candidate" };
      }

      const candidate = await prisma.candidate.create({
        data: {
          tenantId: input.tenantId,
          fullName: input.fullName.trim(),
          email,
          mobile: input.mobile.trim(),
          employeeId: input.employeeId.trim(),
          designation: input.designation.trim(),
          department: input.department.trim(),
          location: input.location.trim(),
          batchName: input.batchName ?? null,
          userId: existingUser.id,
        },
      });

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash, tenantId: input.tenantId },
      });

      return { ok: true, candidateId: candidate.id };
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.CANDIDATE,
        tenantId: input.tenantId,
        candidateProfile: {
          create: {
            tenantId: input.tenantId,
            fullName: input.fullName.trim(),
            email,
            mobile: input.mobile.trim(),
            employeeId: input.employeeId.trim(),
            designation: input.designation.trim(),
            department: input.department.trim(),
            location: input.location.trim(),
            batchName: input.batchName ?? null,
          },
        },
      },
      include: { candidateProfile: { select: { id: true } } },
    });

    const candidateId = user.candidateProfile?.id;
    if (!candidateId) return { ok: false, error: "db" };

    return { ok: true, candidateId };
  } catch {
    return { ok: false, error: "db" };
  }
}
