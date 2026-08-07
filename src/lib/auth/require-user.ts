import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export async function getOptionalSession(): Promise<SessionPayload | null> {
  return getSession();
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const s = await requireSession();
  if (s.role !== "ADMIN" && s.role !== "SUPER_ADMIN") redirect("/login");
  return s;
}

/**
 * Guards a standalone super-admin-only route that lives outside the normal
 * /admin app shell (e.g. the audit-log monitor). Unlike requireAdminSession,
 * this preserves the originally requested path across the login redirect so
 * the caller lands back where they started instead of on /admin/dashboard.
 */
export async function requireSuperAdminForPath(path: string): Promise<SessionPayload> {
  const s = await getOptionalSession();
  if (!s) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (s.role !== "SUPER_ADMIN") redirect("/admin/dashboard");
  return s;
}
