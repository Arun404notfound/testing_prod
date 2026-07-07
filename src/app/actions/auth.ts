"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { clearSession, setSession } from "@/lib/auth/session";

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
    redirect("/login?error=invalid");
  }

  await setSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });

  if (next.startsWith("/") && !next.startsWith("//") && (next === "/admin/dashboard" || next.startsWith("/admin/"))) {
    redirect(next);
  }
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
