"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { clearSession, getSession, setSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit-log";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await logAudit({
      tenantId: user?.tenantId ?? null,
      actorType: "SYSTEM",
      actorId: user?.id ?? null,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user?.id ?? null,
      message: `Failed login attempt for ${email}`,
    });
    redirect("/login?error=invalid");
  }

  await setSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });

  await logAudit({
    tenantId: user.tenantId,
    actorType: user.role,
    actorId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    message: `${user.email} logged in`,
  });

  const nextIsSafe = next.startsWith("/") && !next.startsWith("//");
  if (nextIsSafe && (next === "/admin/dashboard" || next.startsWith("/admin/") || next.startsWith("/monitor/"))) {
    redirect(next);
  }
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  const s = await getSession();
  if (s) {
    await logAudit({
      tenantId: s.tenantId,
      actorType: s.role,
      actorId: s.sub,
      action: "LOGOUT",
      entityType: "User",
      entityId: s.sub,
      message: `${s.email} logged out`,
    });
  }
  await clearSession();
  redirect("/login");
}
