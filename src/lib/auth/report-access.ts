import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "./session";

export async function canAccessReport(resultId: string, session: SessionPayload | null): Promise<boolean> {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") return true;
  if (session.role !== "CANDIDATE" || !session.candidateId) return false;
  const row = await prisma.assessmentResult.findFirst({
    where: { id: resultId, candidateId: session.candidateId },
    select: { id: true },
  });
  return Boolean(row);
}
