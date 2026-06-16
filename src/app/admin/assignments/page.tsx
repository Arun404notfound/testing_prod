import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClipboardCheck, Clock, UserCheck } from "lucide-react";
// Link is used in PageHeader right prop
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";
import { AssignmentForm } from "./assignment-form";
import { AssignmentsTable } from "./assignments-table";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function bulkAssignBatch(formData: FormData) {
  "use server";
  const batchNames = formData.getAll("batchName").map((v) => String(v).trim()).filter(Boolean);
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!batchNames.length || !assessmentId) redirect("/admin/assignments?status=error&reason=missing");

  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const durationRaw  = parseInt(String(formData.get("durationMinutes") ?? ""), 10);
  const expiresAt       = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const durationMinutes = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;

  const tenantId = await getDefaultTenantId();
  const [assessment, candidates] = await Promise.all([
    prisma.assessment.findFirst({ where: { id: assessmentId, lifecycleStatus: "published" }, select: { id: true } }),
    prisma.candidate.findMany({ where: { tenantId, batchName: { in: batchNames } }, select: { id: true } }),
  ]);

  if (!assessment) redirect("/admin/assignments?status=error&reason=not_found");
  if (candidates.length === 0) redirect("/admin/assignments?status=error&reason=batch_empty");

  let created = 0;
  for (const candidate of candidates) {
    const existing = await prisma.assessmentAssignment.findFirst({
      where: {
        candidateId: candidate.id,
        assessmentId,
        status: "assigned",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!existing) {
      await prisma.assessmentAssignment.create({
        data: { candidateId: candidate.id, assessmentId, status: "assigned", expiresAt, durationMinutes },
      });
      created++;
    }
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
  redirect(`/admin/assignments?status=bulk_success&count=${created}&total=${candidates.length}`);
}

async function createAssignment(formData: FormData) {
  "use server";
  const candidateId = String(formData.get("candidateId") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!candidateId || !assessmentId) redirect("/admin/assignments?status=error&reason=missing");

  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const durationRaw  = parseInt(String(formData.get("durationMinutes") ?? ""), 10);
  const expiresAt       = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const durationMinutes = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;

  const tenantId = await getDefaultTenantId();
  const [candidate, assessment] = await Promise.all([
    prisma.candidate.findFirst({ where: { id: candidateId, tenantId }, select: { id: true } }),
    prisma.assessment.findFirst({ where: { id: assessmentId, lifecycleStatus: "published" }, select: { id: true } }),
  ]);
  if (!candidate || !assessment) redirect("/admin/assignments?status=error&reason=not_found");

  const existing = await prisma.assessmentAssignment.findFirst({
    where: {
      candidateId,
      assessmentId,
      status: "assigned",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (existing) redirect("/admin/assignments?status=error&reason=duplicate");

  await prisma.assessmentAssignment.create({
    data: { candidateId, assessmentId, status: "assigned", expiresAt, durationMinutes },
  });

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

async function deleteAssignmentById(id: string) {
  "use server";
  if (!id) return;
  await prisma.assessmentAssignment.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

async function cancelAssignmentById(id: string) {
  "use server";
  if (!id) return;
  await prisma.assessmentAssignment.update({ where: { id }, data: { status: "cancelled" } }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

async function bulkDeleteAssignments(ids: string[]) {
  "use server";
  if (!ids.length) return;
  await prisma.assessmentAssignment.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

async function deleteBatchAssignments(formData: FormData) {
  "use server";
  const batchName = String(formData.get("batchName") ?? "").trim();
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  if (!batchName) redirect("/admin/assignments?status=error&reason=missing");

  const tenantId = await getDefaultTenantId();
  const candidates = await prisma.candidate.findMany({
    where: { tenantId, batchName },
    select: { id: true },
  });
  if (candidates.length === 0) redirect("/admin/assignments?status=error&reason=batch_empty");

  const candidateIds = candidates.map((c) => c.id);
  const where = assessmentId
    ? { candidateId: { in: candidateIds }, assessmentId }
    : { candidateId: { in: candidateIds } };

  const { count } = await prisma.assessmentAssignment.deleteMany({ where });

  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
  redirect(`/admin/assignments?status=delete_batch_success&count=${count}&batchName=${encodeURIComponent(batchName)}`);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  assigned: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", cls: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-300" },
  expired: { label: "Expired", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string; assessmentId?: string; assessmentTitle?: string; count?: string; total?: string; batchName?: string; deletedCount?: string }>;
}) {
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const [candidates, assessments, assignments, batchRows] = await Promise.all([
    prisma.candidate.findMany({ where: { tenantId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.assessment.findMany({
      where: {
        lifecycleStatus: "published",
        OR: [
          { questions: { some: {} } },
          { items: { some: {} } },
          { triadGroups: { some: {} } },
          { compositionItems: { some: {} } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.assessmentAssignment.findMany({
      where: { candidate: { tenantId } },
      include: {
        candidate: { select: { fullName: true, email: true, batchName: true } },
        assessment: { select: { id: true, title: true } },
        result: { select: { id: true } },
      },
      orderBy: { assignedAt: "desc" },
    }),
    prisma.candidate.findMany({
      where: { tenantId },
      select: { batchName: true },
      orderBy: { batchName: "asc" },
    }),
  ]);

  const batches = [...new Set(batchRows.map((b) => b.batchName).filter((b): b is string => Boolean(b)))];

  const pending = assignments.filter((a) => a.status === "assigned").length;
  const completed = assignments.filter((a) => a.status === "completed").length;
  const cancelled = assignments.filter((a) => a.status === "cancelled").length;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Assign assessments to candidates and track their status."
        right={
          <div className="flex items-center gap-3">
            <Link href="/admin/assessments" className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#334155] transition">
              ← Back to assessments
            </Link>
            <a href="#new-assignment" className="tg-button-primary text-sm">+ New Assignment</a>
          </div>
        }
      />

      {/* Toast notifications */}
      {sp.status === "success" && (
        <AutoDismissToast message="Assignment created. The candidate can now start the assessment." />
      )}
      {sp.status === "bulk_success" && (
        <AutoDismissToast
          message={`Bulk assigned: ${sp.count} new assignment${Number(sp.count) !== 1 ? "s" : ""} created (${sp.total} candidates in batch, duplicates skipped).`}
        />
      )}
      {sp.status === "delete_batch_success" && (
        <AutoDismissToast
          message={`Deleted ${sp.count} assignment${Number(sp.count) !== 1 ? "s" : ""} from batch "${sp.batchName}".`}
        />
      )}
      {sp.status === "error" && (
        <AutoDismissToast
          variant="error"
          message={
            sp.reason === "missing" ? "Please select both a candidate/batch and an assessment." :
            sp.reason === "not_found" ? "Candidate or assessment not found. Only published assessments can be assigned." :
            sp.reason === "duplicate" ? "This candidate already has an active assignment for that assessment." :
            sp.reason === "batch_empty" ? "No candidates found in that batch." :
            "Could not create assignment — please try again."
          }
        />
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

      <AssignmentForm
        candidates={candidates}
        assessments={assessments}
        batches={batches}
        defaultAssessmentId={sp.assessmentId}
        defaultBatchName={sp.batchName}
        createAssignment={createAssignment}
        bulkAssignBatch={bulkAssignBatch}
      />

      <AssignmentsTable
        assignments={assignments.map((a) => ({
          ...a,
          assignedAt: a.assignedAt.toISOString(),
        }))}
        batches={batches}
        cancelAssignment={cancelAssignmentById}
        bulkDeleteAssignments={bulkDeleteAssignments}
      />
    </main>
  );
}
