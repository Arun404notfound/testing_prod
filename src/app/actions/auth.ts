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

  const user = await prisma.user.findUnique({
    where: { email },
    include: { candidateProfile: { select: { id: true } } },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  await setSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    candidateId: user.candidateProfile?.id ?? null,
  });

  if (next.startsWith("/") && !next.startsWith("//")) {
    if (user.role === "CANDIDATE") {
      if (next === "/candidate" || next.startsWith("/candidate/")) redirect(next);
    } else if (next === "/admin/dashboard" || next.startsWith("/admin/")) {
      redirect(next);
    }
  }

  if (user.role === "CANDIDATE") {
    redirect("/candidate");
  }
  redirect("/admin/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
