import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "./session";

/**
 * Admins access via their session; candidates have no login and instead prove access
 * with the accessToken from their emailed assignment link.
 */
export async function canAccessReport(
  resultId: string,
  { session, token }: { session: SessionPayload | null; token?: string | null },
): Promise<boolean> {
  if (session && (session.role === "SUPER_ADMIN" || session.role === "ADMIN")) return true;
  if (!token) return false;
  const row = await prisma.assessmentResult.findFirst({
    where: { id: resultId, assignment: { accessToken: token } },
    select: { id: true },
  });
  return Boolean(row);
}
