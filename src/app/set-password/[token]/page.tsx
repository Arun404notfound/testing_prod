import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/password-tokens";

async function setPassword(formData: FormData) {
  "use server";
  const rawToken = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = `/set-password/${encodeURIComponent(rawToken)}`;
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) redirect(`${back}?error=weak`);
  if (password !== confirm) redirect(`${back}?error=mismatch`);
  const token = await prisma.passwordToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || token.expiresAt <= new Date() || (token.usedAt && token.purpose !== "BATCH_SETUP")) redirect(`${back}?error=expired`);
  let userId = token.userId;
  if (token.purpose === "BATCH_SETUP") {
    if (!email) redirect(`${back}?error=email`);
    const candidate = await prisma.candidate.findFirst({ where: { tenantId: token.tenantId, batchName: token.batchName, email }, select: { userId: true, user: { select: { passwordSetAt: true } } } });
    if (!candidate?.userId || candidate.user?.passwordSetAt) redirect(`${back}?error=email`);
    userId = candidate.userId;
  }
  if (!userId) redirect(`${back}?error=expired`);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordSetAt: new Date() } }),
    ...(token.purpose === "BATCH_SETUP" ? [] : [prisma.passwordToken.update({ where: { id: token.id }, data: { usedAt: new Date() } })]),
    prisma.passwordResetRequest.updateMany({ where: { userId, status: "APPROVED" }, data: { reviewedAt: new Date() } }),
  ]);
  redirect("/set-password/success");
}

export default async function SetPasswordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token: rawToken } = await params; const { error } = await searchParams;
  const record = await prisma.passwordToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  const valid = Boolean(record && record.expiresAt > new Date() && (!record.usedAt || record.purpose === "BATCH_SETUP"));
  const isBatch = record?.purpose === "BATCH_SETUP";
  return <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12"><div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-lg"><div className="mb-5 h-1 w-12 rounded-full bg-[#0F766E]"/><h1 className="text-2xl font-bold text-[#0F172A]">{record?.purpose === "RESET" ? "Create a new password" : "Set up your password"}</h1><p className="mt-2 text-sm text-[#64748B]">Use at least 8 characters, including a letter and a number.</p>{!valid ? <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">This link is invalid, expired, or already used. <Link href="/forgot-password" className="font-semibold underline">Request another</Link>.</div> : <form action={setPassword} className="mt-6 space-y-4"><input type="hidden" name="token" value={rawToken}/>{isBatch && <label className="block text-sm font-medium text-[#334155]">Email address<input name="email" type="email" required className="tg-input mt-1 w-full" placeholder="you@company.com"/></label>}<label className="block text-sm font-medium text-[#334155]">New password<input name="password" type="password" required className="tg-input mt-1 w-full" autoComplete="new-password"/></label><label className="block text-sm font-medium text-[#334155]">Confirm password<input name="confirm" type="password" required className="tg-input mt-1 w-full" autoComplete="new-password"/></label>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error === "weak" ? "Use 8+ characters with a letter and number." : error === "mismatch" ? "Passwords do not match." : error === "email" ? "That email is not eligible for this batch link." : "This link is no longer valid."}</p>}<button className="tg-button-primary w-full">Set password</button></form>}</div></main>;
}
