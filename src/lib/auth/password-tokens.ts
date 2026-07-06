import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordToken(input: { purpose: "INITIAL_SETUP" | "RESET" | "BATCH_SETUP"; userId?: string; tenantId?: string | null; batchName?: string | null }) {
  const token = randomBytes(32).toString("base64url");
  await prisma.passwordToken.create({ data: { tokenHash: hashToken(token), purpose: input.purpose, userId: input.userId, tenantId: input.tenantId ?? null, batchName: input.batchName ?? null, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) } });
  return token;
}

export function appUrl(path: string) {
  return `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
