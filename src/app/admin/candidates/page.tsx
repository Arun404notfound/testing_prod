import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";
import { createCandidate } from "@/lib/candidate-user";
import { CandidatesTable } from "./candidates-table";
import { BatchSelect } from "@/components/ui/batch-select";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function addCandidate(formData: FormData) {
  "use server";
  const payload = {
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim(),
    employeeId: String(formData.get("employeeId") ?? "").trim(),
    designation: String(formData.get("designation") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
  };
  const batchName = String(formData.get("batchName") ?? "").trim() || null;
  if (Object.values(payload).some((v) => !v)) redirect("/admin/candidates?status=error&reason=missing");

  const tenantId = await getDefaultTenantId();
  const result = await createCandidate({ ...payload, tenantId, batchName });
  if (!result.ok) redirect("/admin/candidates?status=error&reason=unknown");
  revalidatePath("/admin/candidates");
  redirect("/admin/candidates?status=success");
}

async function updateCandidate(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  if (!id || !fullName) redirect("/admin/candidates?status=error&reason=missing");
  await prisma.candidate.update({
    where: { id },
    data: { fullName, mobile, employeeId, designation, department, location },
  }).catch(() => {});
  revalidatePath("/admin/candidates");
  redirect("/admin/candidates?status=edit_success");
}

async function deleteCandidate(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.candidate.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/candidates");
}

async function deleteCandidateById(id: string) {
  "use server";
  if (!id) return;
  await prisma.candidate.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/candidates");
}

async function bulkDeleteCandidates(ids: string[]) {
  "use server";
  if (!ids.length) return;
  await prisma.candidate.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  revalidatePath("/admin/candidates");
}

// ─── Shared field component ───────────────────────────────────────────────────

function Field({ label, name, value, type = "text", placeholder }: {
  label: string; name: string; value?: string; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#475569]">{label}</label>
      <input
        name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder ?? label}
        className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
        required
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string; editId?: string; addNew?: string }>;
}) {
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();
  const addNewOpen = sp.addNew === "1";
  const editId = sp.editId ?? null;

  const allCandidates = await prisma.candidate.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  const editingCandidate = editId ? allCandidates.find((c) => c.id === editId) ?? null : null;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Candidates"
        subtitle="Manage candidate profiles."
        right={
          <Link href="/admin/candidates?addNew=1" className="tg-button-primary text-sm">+ Add Candidate</Link>
        }
      />

      {/* Status banners */}
      {sp.status === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Candidate added successfully.</div>
      )}
      {sp.status === "edit_success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Candidate updated successfully.</div>
      )}
      {sp.status === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {sp.reason === "missing" ? "Please fill in all required fields." : "Something went wrong — please try again."}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="relative flex min-h-[130px] flex-col justify-between overflow-hidden rounded-2xl border border-[#BFDBFE] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: "linear-gradient(145deg,#EFF6FF 0%,#ffffff 100%)" }}>
          <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-2xl bg-[#2563EB]" />
          <div className="rounded-xl bg-[#DBEAFE] p-2.5 w-fit shadow-sm"><Users size={18} className="text-[#2563EB]" strokeWidth={2.2} /></div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2563EB]/80">Total Candidates</p>
            <p className="mt-1 text-[32px] font-bold leading-none tracking-tight text-[#0F172A]">{allCandidates.length}</p>
          </div>
        </div>
        <div className="relative flex min-h-[130px] flex-col justify-between overflow-hidden rounded-2xl border border-[#99F6E4] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: "linear-gradient(145deg,#F0FDFA 0%,#ffffff 100%)" }}>
          <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-2xl bg-[#0F766E]" />
          <div className="rounded-xl bg-[#CCFBF1] p-2.5 w-fit shadow-sm"><UserCheck size={18} className="text-[#0F766E]" strokeWidth={2.2} /></div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#0F766E]/80">Batches</p>
            <p className="mt-1 text-[32px] font-bold leading-none tracking-tight text-[#0F172A]">
              {new Set(allCandidates.map((c) => c.batchName).filter(Boolean)).size}
            </p>
          </div>
        </div>
        <div className="relative flex min-h-[130px] flex-col justify-between overflow-hidden rounded-2xl border border-[#FDE68A] p-5 shadow-sm" style={{ background: "linear-gradient(145deg,#FFFBEB 0%,#ffffff 100%)" }}>
          <div className="absolute left-0 top-0 h-[3px] w-full rounded-t-2xl bg-[#D97706]" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#D97706]/80">Link-based access</p>
          <p className="mt-2 text-sm font-semibold text-[#92400E]">Candidates take tests via an emailed link — no login required</p>
        </div>
      </div>

      {/* Add / Edit form */}
      {(addNewOpen || editingCandidate) && (
        <div className="overflow-hidden rounded-2xl border border-[#D1D9E6] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-1 rounded-full bg-[#0F766E]" />
              <p className="text-base font-bold text-[#0F172A]">{editingCandidate ? `Edit: ${editingCandidate.fullName}` : "Add New Candidate"}</p>
            </div>
            <Link href="/admin/candidates" className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors">Cancel</Link>
          </div>
          <form action={editingCandidate ? updateCandidate : addCandidate} className="p-5">
            {editingCandidate && <input type="hidden" name="id" value={editingCandidate.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name *" name="fullName" value={editingCandidate?.fullName} placeholder="Ramesh Kumar" />
              {!editingCandidate && <Field label="Email *" name="email" type="email" placeholder="ramesh@company.com" />}
              <Field label="Mobile *" name="mobile" value={editingCandidate?.mobile} placeholder="+91 9876543210" />
              <Field label="Employee ID *" name="employeeId" value={editingCandidate?.employeeId} placeholder="EMP001" />
              <Field label="Designation *" name="designation" value={editingCandidate?.designation} placeholder="Senior Manager" />
              <Field label="Department *" name="department" value={editingCandidate?.department} placeholder="Sales" />
              <Field label="Location *" name="location" value={editingCandidate?.location} placeholder="Mumbai" />
              {!editingCandidate && (
                <BatchSelect
                  existingBatches={[...new Set(allCandidates.map((c) => c.batchName).filter((b): b is string => Boolean(b)))]}
                />
              )}
            </div>
            {!editingCandidate && (
              <p className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#92400E]">
                No password setup needed — candidates get a one-time test link by email when you assign an assessment. Email cannot be changed later.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3 border-t border-[#F1F5F9] pt-5">
              <Link href="/admin/candidates" className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]">Cancel</Link>
              <button type="submit" className="tg-button-primary text-sm">
                {editingCandidate ? "Save Changes" : "Add Candidate"}
              </button>
            </div>
          </form>
        </div>
      )}

      <CandidatesTable
        candidates={allCandidates.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          mobile: c.mobile,
          employeeId: c.employeeId,
          designation: c.designation,
          department: c.department,
          location: c.location,
          batchName: c.batchName,
        }))}
        editId={editId}
        deleteCandidateById={deleteCandidateById}
        bulkDeleteCandidates={bulkDeleteCandidates}
      />
    </main>
  );
}
