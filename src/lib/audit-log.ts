import { prisma } from "@/lib/prisma";

export type AuditActorType = "CANDIDATE" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";

interface LogAuditInput {
  tenantId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
}

/**
 * Writes an audit-trail entry (login/test-start/test-submit/admin actions, etc).
 * Never throws — a logging failure must not break the candidate test flow or admin actions.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message ?? null,
      },
    });
  } catch (err) {
    console.error("[audit-log] failed to write entry", input.action, String(err));
  }
}
