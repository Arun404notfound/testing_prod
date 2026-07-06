import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Bell, CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-user";
import { appUrl, createPasswordToken } from "@/lib/auth/password-tokens";
import { ShareLinkCard } from "@/components/auth/share-link-card";
import { PageHeader } from "@/components/ui/page-header";

async function reviewRequest(formData: FormData) { "use server";
  const session = await requireAdminSession(); const id = String(formData.get("id") ?? ""); const decision = String(formData.get("decision") ?? "");
  const request = await prisma.passwordResetRequest.findFirst({ where: { id, tenantId: session.tenantId, status: "PENDING" }, include: { user: { select: { id: true, email: true } } } });
  if (!request) redirect("/admin/authentication?error=missing");
  if (decision === "reject") { await prisma.passwordResetRequest.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: session.sub } }); revalidatePath("/admin/authentication"); redirect("/admin/authentication?reviewed=rejected"); }
  const token = await createPasswordToken({ purpose: "RESET", userId: request.user.id, tenantId: session.tenantId });
  await prisma.passwordResetRequest.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedBy: session.sub } });
  revalidatePath("/admin/authentication"); redirect(`/admin/authentication?reviewed=approved&token=${encodeURIComponent(token)}&email=${encodeURIComponent(request.user.email)}`);
}

export default async function AuthenticationPage({ searchParams }: { searchParams: Promise<{ reviewed?: string; token?: string; email?: string }> }) {
  const session = await requireAdminSession(); const sp = await searchParams;
  const [requests, candidates] = await Promise.all([
    prisma.passwordResetRequest.findMany({ where: { tenantId: session.tenantId }, include: { user: { select: { email: true, candidateProfile: { select: { fullName: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.candidate.findMany({ where: { tenantId: session.tenantId }, include: { user: { select: { passwordSetAt: true } } }, orderBy: { fullName: "asc" } }),
  ]);
  const pending = requests.filter((r) => r.status === "PENDING"); const configured = candidates.filter((c) => c.user?.passwordSetAt).length;
  return <main className="tg-page space-y-6"><PageHeader title="Authentication" subtitle="Review password reset requests and monitor candidate account setup."/>
    {sp.reviewed === "approved" && sp.token && <ShareLinkCard message={`Your AptIQ password reset was approved for ${sp.email ?? "your account"}. Set a new password through the following link:`} link={appUrl(`/set-password/${sp.token}`)}/>} 
    <div className="grid gap-3 sm:grid-cols-3"><Stat icon={<Bell size={18}/>} label="Pending requests" value={pending.length} color="amber"/><Stat icon={<CheckCircle2 size={18}/>} label="Passwords set" value={configured} color="emerald"/><Stat icon={<Clock3 size={18}/>} label="Awaiting setup" value={candidates.length-configured} color="blue"/></div>
    <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white"><div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4"><h2 className="font-bold text-[#0F172A]">Reset notifications</h2><p className="text-xs text-[#64748B]">Approve to generate a shareable reset link, or reject the request.</p></div><div className="divide-y divide-[#F1F5F9]">{pending.length ? pending.map((r)=><div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="rounded-xl bg-amber-50 p-2 text-amber-600"><Bell size={16}/></div><div className="min-w-0 flex-1"><p className="font-semibold text-[#0F172A]">{r.user.candidateProfile?.fullName ?? r.user.email}</p><p className="text-xs text-[#64748B]">{r.user.email} · {r.createdAt.toLocaleString("en-IN")}</p></div><form action={reviewRequest} className="flex gap-2"><input type="hidden" name="id" value={r.id}/><button name="decision" value="approve" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><ShieldCheck size={13}/> Approve</button><button name="decision" value="reject" className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"><XCircle size={13}/> Reject</button></form></div>) : <p className="px-5 py-10 text-center text-sm text-[#94A3B8]">No pending password reset requests.</p>}</div></section>
    <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white"><div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4"><h2 className="font-bold text-[#0F172A]">Candidate password status</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[#F1F5F9] text-left text-xs text-[#94A3B8]"><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#F8FAFC]">{candidates.map((c)=><tr key={c.id}><td className="px-5 py-3 font-semibold text-[#0F172A]">{c.fullName}</td><td className="px-5 py-3 text-[#64748B]">{c.email}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c.user?.passwordSetAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{c.user?.passwordSetAt ? "Password set" : "Not set"}</span></td></tr>)}</tbody></table></div></section>
  </main>;
}

function Stat({ icon,label,value,color }:{icon:React.ReactNode;label:string;value:number;color:"amber"|"emerald"|"blue"}) { const c={amber:"border-amber-200 bg-amber-50 text-amber-700",emerald:"border-emerald-200 bg-emerald-50 text-emerald-700",blue:"border-blue-200 bg-blue-50 text-blue-700"}[color]; return <div className={`rounded-2xl border p-5 ${c}`}><div className="flex items-center gap-2">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div><p className="mt-3 text-3xl font-bold text-[#0F172A]">{value}</p></div>; }
