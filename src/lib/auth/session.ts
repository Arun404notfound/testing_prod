import { cookies } from "next/headers";
import type { SessionPayload } from "./jwt-session";
import { verifySessionToken, signSession } from "./jwt-session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "./session-cookie";

const cookieBase = {
  path: "/" as const,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export type { SessionPayload };

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    ...cookieBase,
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    ...cookieBase,
    maxAge: 0,
  });
  jar.delete(SESSION_COOKIE_NAME);
}
