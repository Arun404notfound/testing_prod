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
