import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export type CandidateSessionPayload = SessionPayload & { candidateId: string };

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
  if (s.role !== "ADMIN" && s.role !== "SUPER_ADMIN") redirect("/candidate");
  return s;
}

/** Logged-in candidate portal (may not have a linked Candidate row yet). */
export async function requireCandidateRoleSession(): Promise<SessionPayload & { role: "CANDIDATE" }> {
  const s = await requireSession();
  if (s.role !== "CANDIDATE") redirect("/admin/dashboard");
  return s as SessionPayload & { role: "CANDIDATE" };
}

export async function requireCandidateSession(): Promise<CandidateSessionPayload> {
  const s = await requireSession();
  if (s.role !== "CANDIDATE") redirect("/admin/dashboard");
  if (!s.candidateId) redirect("/candidate?notice=no-profile");
  return { ...s, candidateId: s.candidateId };
}
