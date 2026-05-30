import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClipboardCheck, Clock, UserCheck, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createAssignment(formData: FormData) {
  "use server";
  const candidateId = String(formData.get("candidateId") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!candidateId || !assessmentId) redirect("/admin/assignments?status=error&reason=missing");

  try {
    const tenantId = await getDefaultTenantId();
    const [candidate, assessment] = await Promise.all([
      prisma.candidate.findFirst({ where: { id: candidateId, tenantId }, select: { id: true } }),
      prisma.assessment.findFirst({ where: { id: assessmentId, lifecycleStatus: "published" }, select: { id: true } }),
    ]);
    if (!candidate || !assessment) redirect("/admin/assignments?status=error&reason=not_found");

    // Check for existing active assignment
    const existing = await prisma.assessmentAssignment.findFirst({
      where: { candidateId, assessmentId, status: "assigned" },
    });
    if (existing) redirect("/admin/assignments?status=error&reason=duplicate");

    await prisma.assessmentAssignment.create({ data: { candidateId, assessmentId, status: "assigned" } });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/assignments?status=error&reason=db");
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
  redirect("/admin/assignments?status=success");
}

async function cancelAssignment(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentAssignment.update({
    where: { id },
    data: { status: "cancelled" },
  }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

async function deleteAssignment(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentAssignment.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  assigned: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", cls: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const [candidates, assessments, assignments] = await Promise.all([
    prisma.candidate.findMany({ where: { tenantId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.assessment.findMany({ where: { lifecycleStatus: "published" }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } }),
    prisma.assessmentAssignment.findMany({
      where: { candidate: { tenantId } },
      include: {
        candidate: { select: { fullName: true, email: true } },
        assessment: { select: { title: true } },
        result: { select: { id: true } },
      },
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  const pending = assignments.filter((a) => a.status === "assigned").length;
  const completed = assignments.filter((a) => a.status === "completed").length;
  const cancelled = assignments.filter((a) => a.status === "cancelled").length;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Assign assessments to candidates and track their status."
        right={
          <a href="#new-assignment" className="tg-button-primary text-sm">+ New Assignment</a>
        }
      />

      {/* Status banners */}
      {sp.status === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Assignment created. The candidate can now start the assessment.</div>
      )}
      {sp.status === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {sp.reason === "missing" ? "Please select both a candidate and an assessment." :
           sp.reason === "not_found" ? "Candidate or assessment not found. Only published assessments can be assigned." :
           sp.reason === "duplicate" ? "This candidate already has an active assignment for that assessment." :
           "Could not create assignment — please try again."}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending, icon: Clock, cls: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completed", value: completed, icon: ClipboardCheck, cls: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total", value: assignments.length, icon: UserCheck, cls: "text-[#1D4ED8]", bg: "bg-[#EFF6FF]" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon size={16} className={s.cls} />
              </div>
              <p className="text-xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs font-medium text-[#64748B]">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* New assignment form */}
      <div id="new-assignment" className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
          <p className="text-sm font-semibold text-[#0F172A]">New Assignment</p>
          <p className="mt-0.5 text-xs text-[#64748B]">Only published assessments appear in the list below.</p>
        </div>
        <form action={createAssignment} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#475569]">Candidate *</label>
              <select name="candidateId" required className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#1D4ED8] focus:outline-none">
                <option value="">Select candidate…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>
                ))}
              </select>
              {candidates.length === 0 && <p className="mt-1 text-xs text-amber-600">⚠ No candidates yet. <Link href="/admin/candidates" className="underline">Add candidates first.</Link></p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#475569]">Assessment *</label>
              <select name="assessmentId" required className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] focus:border-[#1D4ED8] focus:outline-none">
                <option value="">Select assessment…</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              {assessments.length === 0 && <p className="mt-1 text-xs text-amber-600">⚠ No published assessments. <Link href="/admin/assessments" className="underline">Publish an assessment first.</Link></p>}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={candidates.length === 0 || assessments.length === 0}
              className="rounded-xl bg-[#1D4ED8] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e40af] disabled:opacity-40 transition">
              Assign Assessment
            </button>
          </div>
        </form>
      </div>

      {/* Assignments table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">All Assignments ({assignments.length})</p>
            <p className="text-xs text-[#64748B]">{pending} pending · {completed} completed · {cancelled} cancelled</p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-[#64748B]">No assignments yet. Create one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-left text-xs font-semibold text-[#94A3B8]">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Assessment</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {assignments.map((a) => {
                  const style = STATUS_STYLES[a.status] ?? STATUS_STYLES.assigned;
                  return (
                    <tr key={a.id} className="hover:bg-[#FAFBFE] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-[#0F172A]">{a.candidate.fullName}</p>
                        <p className="text-xs text-[#94A3B8]">{a.candidate.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[#334155]">{a.assessment.title}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${style.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#64748B]">{fmtDate(a.assignedAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {a.result?.id && (
                            <Link href={`/admin/reports/${a.result.id}`}
                              className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-medium text-[#1D4ED8] hover:bg-[#EFF6FF] transition">
                              Report
                            </Link>
                          )}
                          {a.status === "assigned" && (
                            <form action={cancelAssignment}>
                              <input type="hidden" name="id" value={a.id} />
                              <button type="submit" className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 transition">
                                Cancel
                              </button>
                            </form>
                          )}
                          {a.status !== "completed" && (
                            <form action={deleteAssignment}>
                              <input type="hidden" name="id" value={a.id} />
                              <button type="submit" className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 transition">
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
