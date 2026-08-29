import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClipboardCheck, Clock, UserCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";
import { appUrl } from "@/lib/app-url";
import { sendAssignmentAssignedEmail } from "@/lib/email/assignment-email";
import { loadAssignableProgram, checkAssignabilityReason, createProgramAssignmentRecord } from "@/lib/program-assignment";
import { ProgramAssignmentForm } from "./program-assignment-form";
import { ProgramAssignmentsTable } from "./program-assignments-table";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";

// ─── Server Actions ───────────────────────────────────────────────────────────
// Mirrors assignProgramToCandidate/assignProgramToBatch in
// admin/programs/[programId]/builder/actions.ts, but the Program is picked
// from a dropdown here rather than fixed by the page's own route — so these
// stay on /admin/assignments (toast + redirect back here) instead of jumping
// into that Program's builder.

function parseExpiresAt(formData: FormData): Date | null {
  const raw = String(formData.get("expiresAt") ?? "").trim();
  return raw ? new Date(raw) : null;
}

async function bulkAssignBatch(formData: FormData) {
  "use server";
  const batchNames = formData.getAll("batchName").map((v) => String(v).trim()).filter(Boolean);
  const programId = String(formData.get("programId") ?? "").trim();
  if (!batchNames.length || !programId) redirect("/admin/assignments?status=error&reason=missing");

  const expiresAt = parseExpiresAt(formData);
  const tenantId = await getDefaultTenantId();
  const [program, candidates] = await Promise.all([
    loadAssignableProgram(programId),
    prisma.candidate.findMany({ where: { tenantId, batchName: { in: batchNames } }, select: { id: true, fullName: true, email: true } }),
  ]);
  if (!program) redirect("/admin/assignments?status=error&reason=not_found");
  const reason = checkAssignabilityReason(program);
  if (reason) redirect(`/admin/assignments?status=error&reason=${encodeURIComponent(reason)}`);
  if (candidates.length === 0) redirect("/admin/assignments?status=error&reason=batch_empty");

  let created = 0;
  let emailFailures = 0;
  for (const candidate of candidates) {
    const existing = await prisma.programAssignment.findFirst({
      where: {
        programId,
        candidateId: candidate.id,
        status: "assigned",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (existing) continue;

    const assignment = await createProgramAssignmentRecord(program, candidate.id, expiresAt);
    created++;
    const emailResult = await sendAssignmentAssignedEmail({
      tenantId,
      candidateEmail: candidate.email,
      candidateName: candidate.fullName,
      assessmentTitle: program.title,
      link: appUrl(`/candidate/program/${assignment.programAssignmentId}?token=${assignment.accessToken}`),
      durationMinutes: null,
      expiresAt,
    });
    if (!emailResult.ok) emailFailures++;
  }

  revalidatePath("/admin/assignments");
  redirect(`/admin/assignments?status=bulk_success&count=${created}&total=${candidates.length}&emailFailures=${emailFailures}`);
}

async function createAssignment(formData: FormData) {
  "use server";
  const candidateId = String(formData.get("candidateId") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();
  if (!candidateId || !programId) redirect("/admin/assignments?status=error&reason=missing");

  const expiresAt = parseExpiresAt(formData);
  const tenantId = await getDefaultTenantId();
  const [candidate, program] = await Promise.all([
    prisma.candidate.findFirst({ where: { id: candidateId, tenantId }, select: { id: true, fullName: true, email: true } }),
    loadAssignableProgram(programId),
  ]);
  if (!candidate || !program) redirect("/admin/assignments?status=error&reason=not_found");
  const reason = checkAssignabilityReason(program);
  if (reason) redirect(`/admin/assignments?status=error&reason=${encodeURIComponent(reason)}`);

  const existing = await prisma.programAssignment.findFirst({
    where: {
      candidateId,
      programId,
      status: "assigned",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (existing) redirect("/admin/assignments?status=error&reason=duplicate");

  const assignment = await createProgramAssignmentRecord(program, candidateId, expiresAt);

  const emailResult = await sendAssignmentAssignedEmail({
    tenantId,
    candidateEmail: candidate.email,
    candidateName: candidate.fullName,
    assessmentTitle: program.title,
    link: appUrl(`/candidate/program/${assignment.programAssignmentId}?token=${assignment.accessToken}`),
    durationMinutes: null,
    expiresAt,
  });

  revalidatePath("/admin/assignments");
  redirect(`/admin/assignments?status=success${emailResult.ok ? "" : "&emailFailed=1"}`);
}

async function cancelAssignmentById(id: string) {
  "use server";
  if (!id) return;
  await prisma.programAssignment.update({ where: { id }, data: { status: "cancelled" } }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

async function bulkDeleteAssignments(ids: string[]) {
  "use server";
  if (!ids.length) return;
  await prisma.programAssignment.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  revalidatePath("/admin/assignments");
  revalidatePath("/candidate");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string; programId?: string; count?: string; total?: string; batchName?: string; filterStatus?: string; emailFailed?: string; emailFailures?: string }>;
}) {
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const [candidates, programsRaw, assignments, batchRows] = await Promise.all([
    prisma.candidate.findMany({ where: { tenantId }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    prisma.program.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, assessments: { select: { assessment: { select: { lifecycleStatus: true } } } } },
    }),
    prisma.programAssignment.findMany({
      where: { candidate: { tenantId } },
      include: {
        candidate: { select: { fullName: true, email: true, batchName: true } },
        program: { select: { id: true, title: true } },
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

  // Only fully-published Programs (every attached module published, at least one attached) can be assigned — same rule the Program builder's own assign form enforces.
  const programs = programsRaw
    .filter((p) => p.assessments.length > 0 && p.assessments.every((pa) => pa.assessment.lifecycleStatus === "published"))
    .map((p) => ({ id: p.id, title: p.title }));

  const batches = [...new Set(batchRows.map((b) => b.batchName).filter((b): b is string => Boolean(b)))];

  const pending = assignments.filter((a) => a.status === "assigned").length;
  const completed = assignments.filter((a) => a.status === "completed").length;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Assign Program"
        subtitle="Assign a Program — its modules bundled into one candidate-facing link — and track status."
        right={
          <div className="flex items-center gap-3">
            <Link href="/admin/programs" className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#334155] transition">
              ← Back to programs
            </Link>
            <a href="#new-assignment" className="tg-button-primary text-sm">+ New Assignment</a>
          </div>
        }
      />

      {/* Toast notifications */}
      {sp.status === "success" && (
        <AutoDismissToast
          variant={sp.emailFailed ? "error" : undefined}
          message={
            sp.emailFailed
              ? "Assignment created, but the notification email could not be sent. Check the Brevo configuration."
              : "Assignment created. The candidate has been emailed a link to start the Program."
          }
        />
      )}
      {sp.status === "bulk_success" && (
        <AutoDismissToast
          variant={Number(sp.emailFailures) > 0 ? "error" : undefined}
          message={
            `Bulk assigned: ${sp.count} new assignment${Number(sp.count) !== 1 ? "s" : ""} created (${sp.total} candidates in batch, duplicates skipped).` +
            (Number(sp.emailFailures) > 0 ? ` ${sp.emailFailures} notification email${Number(sp.emailFailures) !== 1 ? "s" : ""} failed to send.` : "")
          }
        />
      )}
      {sp.status === "error" && (
        <AutoDismissToast
          variant="error"
          message={
            sp.reason === "missing" ? "Please select both a candidate/batch and a Program." :
            sp.reason === "not_found" ? "Candidate or Program not found." :
            sp.reason === "duplicate" ? "This candidate already has an active assignment for that Program." :
            sp.reason === "batch_empty" ? "No candidates found in that batch." :
            sp.reason ? decodeURIComponent(sp.reason) :
            "Could not create assignment — please try again."
          }
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending, icon: Clock, cls: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completed", value: completed, icon: ClipboardCheck, cls: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total", value: assignments.length, icon: UserCheck, cls: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
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

      <ProgramAssignmentForm
        candidates={candidates}
        programs={programs}
        batches={batches}
        defaultProgramId={sp.programId}
        defaultBatchName={sp.batchName}
        createAssignment={createAssignment}
        bulkAssignBatch={bulkAssignBatch}
      />

      <ProgramAssignmentsTable
        assignments={assignments.map((a) => ({
          ...a,
          assignedAt: a.assignedAt.toISOString(),
        }))}
        batches={batches}
        cancelAssignment={cancelAssignmentById}
        bulkDeleteAssignments={bulkDeleteAssignments}
        initialStatus={sp.filterStatus}
      />
    </main>
  );
}
