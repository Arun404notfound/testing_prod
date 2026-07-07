import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/generated/prisma/enums";
import { SESSION_MAX_AGE_SEC } from "./session-cookie";

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
};

function getSecretKey(): Uint8Array {
  const raw = process.env.AUTH_SECRET ?? "dev-insecure-secret-min-32-characters-long!!";
  const buf = new TextEncoder().encode(raw);
  if (buf.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(buf);
    return padded;
  }
  return buf.slice(0, 32);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) return null;
    const role = payload.role as UserRole;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") return null;
    return {
      sub,
      email: typeof payload.email === "string" ? payload.email : "",
      role,
      tenantId: typeof payload.tenantId === "string" ? payload.tenantId : null,
    };
  } catch {
    return null;
  }
}
