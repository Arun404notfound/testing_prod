import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { SCORING_FORMULA_LABELS } from "@/lib/scoring/competencyEngine";
import { WeightEditorPanel } from "@/app/admin/competencies/weight-editor-panel";
import { importJobRoleFromWorkbook } from "@/lib/jobRoleImport";

const BANDS = ["Developing", "Intermediate", "Proficient", "Expert"] as const;
const PROFICIENCY_SCALES: Record<string, string> = {
  GENERIC_5: "Generic 5-band (Exceptional/Strong/Moderate/Developing/Low)",
  MATURITY_4: "Maturity 4-band (Developing/Intermediate/Proficient/Expert)",
};

function backTo(jobRoleId: string, tab: string, extra = "") {
  return `/admin/job-roles?role=${jobRoleId}&tab=${tab}${extra}`;
}

// ─── Server Actions: Job Role ────────────────────────────────────────────────

async function createJobRole(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) redirect("/admin/job-roles?tab=roles&status=error");
  let created;
  try {
    created = await prisma.jobRole.create({ data: { tenantId, name, slug, description } });
  } catch {
    redirect("/admin/job-roles?tab=roles&status=error");
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(created.id, "mapping", "&status=success"));
}

async function updateJobRole(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!id || !name) redirect("/admin/job-roles?tab=roles&status=error");
  try {
    await prisma.jobRole.update({ where: { id }, data: { name, slug, description, isActive } });
  } catch {
    redirect("/admin/job-roles?tab=roles&status=error");
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(id, "roles", "&status=success"));
}

async function deleteJobRole(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.jobRole.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/job-roles");
  redirect("/admin/job-roles?tab=roles");
}

async function importJobRoleWorkbook(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const jobRoleName = String(formData.get("jobRoleName") ?? "").trim();
  const file = formData.get("file");
  if (!jobRoleName || !(file instanceof File)) {
    redirect("/admin/job-roles?tab=roles&status=import-error");
  }

  let redirectTarget: string;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await importJobRoleFromWorkbook({ tenantId, jobRoleName, bytes });
    const warn = result.warnings.length > 0 ? "import-warn" : "import-success";
    redirectTarget = backTo(
      result.jobRoleId,
      "mapping",
      `&status=${warn}&domains=${result.domainCount}&comps=${result.competencyCount}&maps=${result.mappingCount}`,
    );
  } catch {
    redirectTarget = "/admin/job-roles?tab=roles&status=import-error";
  }

  revalidatePath("/admin/job-roles");
  redirect(redirectTarget);
}

// ─── Server Actions: Domain ──────────────────────────────────────────────────

async function createDomain(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!jobRoleId || !name) redirect(backTo(jobRoleId, "mapping", "&status=error"));
  try {
    const count = await prisma.domain.count({ where: { jobRoleId } });
    await prisma.domain.create({ data: { tenantId, jobRoleId, name, description, displayOrder: count } });
  } catch {
    redirect(backTo(jobRoleId, "mapping", "&status=error"));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping", "&status=success"));
}

async function updateDomain(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!id || !name) redirect(backTo(jobRoleId, "mapping", "&status=error"));
  try {
    await prisma.domain.update({ where: { id }, data: { name, description } });
  } catch {
    redirect(backTo(jobRoleId, "mapping", "&status=error"));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping", "&status=success"));
}

async function deleteDomain(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  if (!id) return;
  await prisma.domain.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping"));
}

// ─── Server Actions: Competency ──────────────────────────────────────────────

async function createCompetency(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const domainId = String(formData.get("domainId") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportDescription = String(formData.get("reportDescription") ?? "").trim() || null;
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  const proficiencyScale = String(formData.get("proficiencyScale") ?? "MATURITY_4").trim();
  if (!jobRoleId || !name) redirect(backTo(jobRoleId, "mapping", "&status=error"));
  try {
    await prisma.competency.create({
      data: { tenantId, jobRoleId, domainId, name, description, reportDescription, scoringFormula, proficiencyScale },
    });
  } catch {
    redirect(backTo(jobRoleId, "mapping", "&status=error"));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping", "&status=success"));
}

async function updateCompetency(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const domainId = String(formData.get("domainId") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const reportDescription = String(formData.get("reportDescription") ?? "").trim() || null;
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  const proficiencyScale = String(formData.get("proficiencyScale") ?? "MATURITY_4").trim();
  const strengthStatement = String(formData.get("strengthStatement") ?? "").trim() || null;
  const developmentNeedStatement = String(formData.get("developmentNeedStatement") ?? "").trim() || null;
  if (!id || !name) redirect(backTo(jobRoleId, "mapping", "&status=error"));
  try {
    await prisma.competency.update({
      where: { id },
      data: {
        domainId, name, description, reportDescription, scoringFormula, proficiencyScale,
        strengthStatement, developmentNeedStatement,
      },
    });
  } catch {
    redirect(backTo(jobRoleId, "mapping", "&status=error"));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping", "&status=success"));
}

async function deleteCompetency(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  if (!id) return;
  await prisma.competency.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping"));
}

// ─── Server Actions: Attribute Mappings ──────────────────────────────────────

async function createMapping(formData: FormData) {
  "use server";
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const weight = parseFloat(String(formData.get("weight") ?? "1"));
  if (!attributeId || !competencyId) redirect(backTo(jobRoleId, "mapping", "&status=error"));
  try {
    await prisma.attributeCompetencyMap.upsert({
      where: { attributeId_competencyId: { attributeId, competencyId } },
      create: { attributeId, competencyId, weight: isFinite(weight) ? weight : 1 },
      update: { weight: isFinite(weight) ? weight : 1 },
    });
  } catch {
    redirect(backTo(jobRoleId, "mapping", "&status=error"));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping", "&status=success"));
}

async function deleteMapping(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  if (!id) return;
  await prisma.attributeCompetencyMap.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "mapping"));
}

async function bulkUpdateWeights(updates: { id: string; weight: number }[]) {
  "use server";
  if (!updates.length) return;
  await Promise.all(
    updates.map((u) =>
      prisma.attributeCompetencyMap.update({
        where: { id: u.id },
        data: { weight: isFinite(u.weight) && u.weight > 0 ? u.weight : 1 },
      }).catch(() => {})
    )
  );
  revalidatePath("/admin/job-roles");
}

// ─── Server Actions: Report Content ──────────────────────────────────────────

async function updateBandContent(formData: FormData) {
  "use server";
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const band = String(formData.get("band") ?? "").trim();
  const proficiencyDescription = String(formData.get("proficiencyDescription") ?? "").trim();
  const behaviouralImplications = String(formData.get("behaviouralImplications") ?? "").trim();
  const watchOuts = String(formData.get("watchOuts") ?? "").trim();
  if (!competencyId || !band) redirect(backTo(jobRoleId, "content", "&status=error"));
  try {
    await prisma.competencyBandContent.upsert({
      where: { competencyId_band: { competencyId, band } },
      create: { competencyId, band, proficiencyDescription, behaviouralImplications, watchOuts },
      update: { proficiencyDescription, behaviouralImplications, watchOuts },
    });
  } catch {
    redirect(backTo(jobRoleId, "content", `&comp=${competencyId}&status=error`));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "content", `&comp=${competencyId}&status=success`));
}

async function upsertProject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const displayOrder = parseInt(String(formData.get("displayOrder") ?? "0"), 10) || 0;
  const title = String(formData.get("title") ?? "").trim();
  const whatToDo = String(formData.get("whatToDo") ?? "").trim();
  const howToDoIt = String(formData.get("howToDoIt") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (!competencyId || !title) redirect(backTo(jobRoleId, "content", `&comp=${competencyId}&status=error`));
  try {
    if (id) {
      await prisma.developmentProject.update({ where: { id }, data: { title, whatToDo, howToDoIt, evidence } });
    } else {
      await prisma.developmentProject.create({
        data: { competencyId, displayOrder, title, whatToDo, howToDoIt, evidence },
      });
    }
  } catch {
    redirect(backTo(jobRoleId, "content", `&comp=${competencyId}&status=error`));
  }
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "content", `&comp=${competencyId}&status=success`));
}

async function deleteProject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const jobRoleId = String(formData.get("jobRoleId") ?? "").trim();
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  if (!id) return;
  await prisma.developmentProject.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/job-roles");
  redirect(backTo(jobRoleId, "content", `&comp=${competencyId}`));
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none";
const labelCls = "block text-xs font-medium text-[#475569] mb-1";
const btnPrimary = "rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4edb] disabled:opacity-50";
const btnDanger = "text-xs text-red-500 hover:underline";
const card = "rounded-xl border border-[#E2E8F0] bg-white";
const cardHeader = "border-b border-[#E2E8F0] px-5 py-4";

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function JobRolesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    role?: string;
    comp?: string;
    status?: string;
    editId?: string;
    domains?: string;
    comps?: string;
    maps?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "roles";
  const status = sp.status;
  const editId = sp.editId ?? null;
  const tenantId = await getDefaultTenantId();

  const jobRoles = await prisma.jobRole.findMany({ where: { tenantId }, orderBy: { displayOrder: "asc" } });
  const selectedJobRoleId = sp.role && jobRoles.some((r) => r.id === sp.role) ? sp.role : jobRoles[0]?.id ?? null;

  const [domains, competencies, attributes] = selectedJobRoleId
    ? await Promise.all([
        prisma.domain.findMany({ where: { jobRoleId: selectedJobRoleId }, orderBy: { displayOrder: "asc" } }),
        prisma.competency.findMany({
          where: { jobRoleId: selectedJobRoleId },
          orderBy: { displayOrder: "asc" },
          include: {
            domain: true,
            attributeMaps: { include: { attribute: true } },
            bandContents: true,
            developmentProjects: { orderBy: { displayOrder: "asc" } },
          },
        }),
        prisma.attribute.findMany({ where: { tenantId }, orderBy: { code: "asc" } }),
      ])
    : [[], [], []];

  const mappings = competencies.flatMap((c) => c.attributeMaps.map((m) => ({ ...m, competency: c })));
  const selectedCompId = sp.comp && competencies.some((c) => c.id === sp.comp) ? sp.comp : competencies[0]?.id ?? null;
  const selectedComp = competencies.find((c) => c.id === selectedCompId) ?? null;

  const tabs = [
    { id: "roles", label: `Job Roles (${jobRoles.length})` },
    { id: "mapping", label: `Mapping (${domains.length} domains · ${competencies.length} competencies · ${mappings.length} attrs)` },
    { id: "content", label: "Report Section" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">Job Roles</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Create a Job Role, then map its Domain → Competency → Attribute framework, then fill
          in its Report Section content — or skip straight to importing an Excel workbook.
          Assessments select a Job Role instead of a raw report style.
        </p>
      </div>

      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Something went wrong. Check your input and try again.
        </div>
      )}
      {status === "success" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Saved successfully.
        </div>
      )}
      {status === "import-error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Import failed. Make sure the file matches the expected template (a "Competency framework"
          sheet and a "Report Content" sheet) and try again.
        </div>
      )}
      {(status === "import-success" || status === "import-warn") && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${status === "import-warn" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          Imported {sp.domains ?? "0"} domains, {sp.comps ?? "0"} competencies and {sp.maps ?? "0"} attribute mappings.
          {status === "import-warn" && " Some rows had warnings — check the server log for details."}
        </div>
      )}

      {/* Job Role selector */}
      {jobRoles.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <label className="text-xs font-medium text-[#475569]">Job Role:</label>
          <form action="/admin/job-roles" method="get" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            <select
              name="role"
              defaultValue={selectedJobRoleId ?? ""}
              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#334155] focus:border-[#2563EB] focus:outline-none"
            >
              {jobRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}{r.isActive ? "" : " (inactive)"}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-white border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9]">
              Switch
            </button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex flex-wrap gap-6">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`/admin/job-roles?tab=${t.id}${selectedJobRoleId ? `&role=${selectedJobRoleId}` : ""}`}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                tab === t.id ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ── Job Roles tab ── */}
      {tab === "roles" && (
        <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">{editId ? "Edit Job Role" : "Add Job Role"}</h2>
              {editId && <a href="/admin/job-roles?tab=roles" className="mt-1 block text-xs text-[#94A3B8] hover:text-[#334155]">← Cancel edit</a>}
            </div>
            {(() => {
              const editing = editId ? jobRoles.find((r) => r.id === editId) : null;
              return (
                <form action={editing ? updateJobRole : createJobRole} className="space-y-4 p-5">
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. First-Time Manager" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Slug (optional)</label>
                    <input name="slug" defaultValue={editing?.slug ?? ""} placeholder="e.g. first-time-manager" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description (optional)</label>
                    <textarea name="description" rows={3} defaultValue={editing?.description ?? ""} className={inputCls} />
                  </div>
                  {editing && (
                    <label className="flex items-center gap-2 text-sm text-[#334155]">
                      <input type="checkbox" name="isActive" defaultChecked={editing.isActive} className="rounded border-slate-300" />
                      Active
                    </label>
                  )}
                  <button type="submit" className={btnPrimary}>{editing ? "Save Changes" : "Add Job Role"}</button>
                </form>
              );
            })()}
          </div>

          <div className={card}>
            <div className={cardHeader}><h2 className="text-sm font-semibold text-[#0F172A]">Job Roles ({jobRoles.length})</h2></div>
            {jobRoles.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#64748B]">No job roles yet.</p>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {jobRoles.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{r.name}{!r.isActive && <span className="ml-2 text-xs text-[#94A3B8]">(inactive)</span>}</p>
                      {r.description && <p className="mt-0.5 text-xs text-[#64748B]">{r.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <a href={`/admin/job-roles?tab=roles&editId=${r.id}`} className="text-xs text-[#0F766E] hover:underline">Edit</a>
                      <form action={deleteJobRole}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className={btnDanger}>Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <div className={cardHeader}>
            <h2 className="text-sm font-semibold text-[#0F172A]">Import from Excel</h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Alternative to manual entry: upload a workbook with a "Competency framework" sheet
              (Domain, Competency, Definition, Key Behaviours, Attribute Mapping) and a "Report
              Content" sheet (band descriptions, strength/development-need statements, on-the-job
              projects). Auto-populates domains, competencies, attribute mappings and report
              content in one go. Any attribute name not already in the pool is created automatically.
            </p>
          </div>
          <form action={importJobRoleWorkbook} className="space-y-4 p-5">
            <div>
              <label className={labelCls}>Job Role name *</label>
              <input
                name="jobRoleName"
                required
                placeholder="e.g. First-Time Manager"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[#94A3B8]">Reuses the Job Role if the name already exists, otherwise creates it.</p>
            </div>
            <div>
              <label className={labelCls}>Workbook (.xlsx) *</label>
              <input name="file" type="file" accept=".xlsx" required className={inputCls} />
            </div>
            <button type="submit" className={btnPrimary}>Import Workbook</button>
          </form>
        </div>
        </div>
      )}

      {/* ── Mapping tab: Domains → Competencies → Attribute Mapping ── */}
      {tab === "mapping" && selectedJobRoleId && (
        <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">1. Domains</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">{editId ? "Edit Domain" : "Add Domain"}</h2>
              {editId && <a href={backTo(selectedJobRoleId, "mapping")} className="mt-1 block text-xs text-[#94A3B8] hover:text-[#334155]">← Cancel edit</a>}
            </div>
            {(() => {
              const editing = editId ? domains.find((d) => d.id === editId) : null;
              return (
                <form action={editing ? updateDomain : createDomain} className="space-y-4 p-5">
                  <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                  <div>
                    <label className={labelCls}>Domain Name *</label>
                    <input name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. Leading Self" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description (optional)</label>
                    <textarea name="description" rows={2} defaultValue={editing?.description ?? ""} className={inputCls} />
                  </div>
                  <button type="submit" className={btnPrimary}>{editing ? "Save Changes" : "Add Domain"}</button>
                </form>
              );
            })()}
          </div>

          <div className={card}>
            <div className={cardHeader}><h2 className="text-sm font-semibold text-[#0F172A]">Domains ({domains.length})</h2></div>
            {domains.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#64748B]">No domains yet.</p>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {domains.map((d) => {
                  const compCount = competencies.filter((c) => c.domainId === d.id).length;
                  return (
                    <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{d.name}</p>
                        <p className="mt-0.5 text-xs text-[#64748B]">{compCount} competenc{compCount === 1 ? "y" : "ies"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <a href={backTo(selectedJobRoleId, "mapping", `&editId=${d.id}`)} className="text-xs text-[#0F766E] hover:underline">Edit</a>
                        <form action={deleteDomain}>
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                          <button type="submit" className={btnDanger}>Delete</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">2. Competencies</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">{editId ? "Edit Competency" : "Add Competency"}</h2>
              {editId && <a href={backTo(selectedJobRoleId, "mapping")} className="mt-1 block text-xs text-[#94A3B8] hover:text-[#334155]">← Cancel edit</a>}
            </div>
            {(() => {
              const editing = editId ? competencies.find((c) => c.id === editId) : null;
              return (
                <form action={editing ? updateCompetency : createCompetency} className="space-y-4 p-5">
                  <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                  <div>
                    <label className={labelCls}>Competency Name *</label>
                    <input name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. Ownership and Accountability" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Domain</label>
                    <select name="domainId" defaultValue={editing?.domainId ?? ""} className={inputCls}>
                      <option value="">No domain</option>
                      {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Scoring Formula</label>
                    <select name="scoringFormula" defaultValue={editing?.scoringFormula ?? "WEIGHTED_AVERAGE"} className={inputCls}>
                      {Object.entries(SCORING_FORMULA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Proficiency Scale</label>
                    <select name="proficiencyScale" defaultValue={editing?.proficiencyScale ?? "MATURITY_4"} className={inputCls}>
                      {Object.entries(PROFICIENCY_SCALES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Internal Description</label>
                    <input name="description" defaultValue={editing?.description ?? ""} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Report Description</label>
                    <textarea name="reportDescription" rows={2} defaultValue={editing?.reportDescription ?? ""} className={inputCls} />
                  </div>
                  {editing && (
                    <>
                      <div>
                        <label className={labelCls}>Strength Statement (shown when score {">"} 6.5)</label>
                        <textarea name="strengthStatement" rows={2} defaultValue={editing?.strengthStatement ?? ""} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Development-Need Statement (shown when score ≤ 6.5)</label>
                        <textarea name="developmentNeedStatement" rows={2} defaultValue={editing?.developmentNeedStatement ?? ""} className={inputCls} />
                      </div>
                    </>
                  )}
                  <button type="submit" className={btnPrimary}>{editing ? "Save Changes" : "Add Competency"}</button>
                </form>
              );
            })()}
          </div>

          <div className={card}>
            <div className={cardHeader}><h2 className="text-sm font-semibold text-[#0F172A]">Competencies ({competencies.length})</h2></div>
            {competencies.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#64748B]">No competencies yet.</p>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {competencies.map((c) => (
                  <div key={c.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{c.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {c.domain && <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">{c.domain.name}</span>}
                        <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#2563EB]">{c.attributeMaps.length} attributes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <a href={backTo(selectedJobRoleId, "mapping", `&editId=${c.id}`)} className="text-xs text-[#0F766E] hover:underline">Edit</a>
                      <form action={deleteCompetency}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                        <button type="submit" className={btnDanger}>Delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">3. Attribute Mapping</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className={card}>
              <div className={cardHeader}><h2 className="text-sm font-semibold text-[#0F172A]">Map Competency → Attribute</h2></div>
              <form action={createMapping} className="space-y-4 p-5">
                <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                <div>
                  <label className={labelCls}>Competency *</label>
                  <select name="competencyId" required className={inputCls}>
                    <option value="">Select competency...</option>
                    {competencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Attribute *</label>
                  <select name="attributeId" required className={inputCls}>
                    <option value="">Select attribute...</option>
                    {attributes.map((a) => <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Weight (default 1.0)</label>
                  <input name="weight" type="number" step="0.1" min="0.1" defaultValue="1.0" className={inputCls} />
                </div>
                <button type="submit" disabled={attributes.length === 0 || competencies.length === 0} className={btnPrimary}>Save Mapping</button>
              </form>
            </div>

            {competencies.length > 0 && (
              <WeightEditorPanel
                competencies={competencies.map((c) => ({
                  id: c.id,
                  name: c.name,
                  mappings: c.attributeMaps.map((m) => ({ id: m.id, weight: m.weight, attribute: { code: m.attribute.code, name: m.attribute.name } })),
                }))}
                bulkUpdateWeights={bulkUpdateWeights}
              />
            )}
          </div>

          <div className={card}>
            <div className={cardHeader}><h2 className="text-sm font-semibold text-[#0F172A]">Current Mappings ({mappings.length})</h2></div>
            {mappings.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#64748B]">No mappings yet.</p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {mappings.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded bg-[#EFF6FF] px-2 py-0.5 font-mono text-xs font-bold text-[#2563EB]">{m.attribute.code}</span>
                      <span className="text-[#334155]">{m.attribute.name}</span>
                      <span className="text-[#94A3B8]">→</span>
                      <span className="font-medium text-[#0F172A]">{m.competency.name}</span>
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">w={m.weight}</span>
                    </div>
                    <form action={deleteMapping}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                      <button type="submit" className={btnDanger}>Remove</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </section>
        </div>
      )}

      {/* ── Report Content tab ── */}
      {tab === "content" && selectedJobRoleId && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className={card}>
            <div className={cardHeader}><h2 className="text-sm font-semibold text-[#0F172A]">Competencies</h2></div>
            <div className="divide-y divide-[#F8FAFC]">
              {competencies.map((c) => (
                <a
                  key={c.id}
                  href={backTo(selectedJobRoleId, "content", `&comp=${c.id}`)}
                  className={`block px-4 py-3 text-sm ${selectedCompId === c.id ? "bg-[#EFF6FF] text-[#2563EB] font-medium" : "text-[#334155] hover:bg-[#F8FAFC]"}`}
                >
                  {c.name}
                </a>
              ))}
            </div>
          </div>

          {selectedComp ? (
            <div className="space-y-6">
              {/* Band content */}
              <div className={card}>
                <div className={cardHeader}>
                  <h2 className="text-sm font-semibold text-[#0F172A]">{selectedComp.name} — Band Content</h2>
                  <p className="mt-0.5 text-xs text-[#64748B]">Proficiency description, behavioural implications and watch-outs shown in the report for each band.</p>
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {BANDS.map((band) => {
                    const content = selectedComp.bandContents.find((b) => b.band === band);
                    return (
                      <form key={band} action={updateBandContent} className="space-y-3 p-5">
                        <input type="hidden" name="competencyId" value={selectedComp.id} />
                        <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                        <input type="hidden" name="band" value={band} />
                        <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">{band}</p>
                        <div>
                          <label className={labelCls}>Proficiency Description</label>
                          <textarea name="proficiencyDescription" rows={3} defaultValue={content?.proficiencyDescription ?? ""} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Behavioural Implications (one per line)</label>
                          <textarea name="behaviouralImplications" rows={3} defaultValue={content?.behaviouralImplications ?? ""} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Watch-outs (one per line)</label>
                          <textarea name="watchOuts" rows={3} defaultValue={content?.watchOuts ?? ""} className={inputCls} />
                        </div>
                        <button type="submit" className="rounded bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4edb]">Save {band}</button>
                      </form>
                    );
                  })}
                </div>
              </div>

              {/* Development projects */}
              <div className={card}>
                <div className={cardHeader}>
                  <h2 className="text-sm font-semibold text-[#0F172A]">On-the-Job Development Projects</h2>
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {selectedComp.developmentProjects.map((p, i) => (
                    <div key={p.id} className="space-y-3 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">Project {i + 1}</p>
                        <form action={deleteProject}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                          <input type="hidden" name="competencyId" value={selectedComp.id} />
                          <button type="submit" className={btnDanger}>Remove</button>
                        </form>
                      </div>
                      <form action={upsertProject} className="space-y-3">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="competencyId" value={selectedComp.id} />
                        <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                        <input type="hidden" name="displayOrder" value={p.displayOrder} />
                        <div>
                          <label className={labelCls}>Title</label>
                          <input name="title" defaultValue={p.title} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>What to do</label>
                          <textarea name="whatToDo" rows={2} defaultValue={p.whatToDo} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>How to do it</label>
                          <textarea name="howToDoIt" rows={2} defaultValue={p.howToDoIt} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Evidence</label>
                          <textarea name="evidence" rows={2} defaultValue={p.evidence} className={inputCls} />
                        </div>
                        <button type="submit" className="rounded bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4edb]">Save Project {i + 1}</button>
                      </form>
                    </div>
                  ))}
                  {/* Add new project */}
                  <form action={upsertProject} className="space-y-3 p-5">
                    <input type="hidden" name="competencyId" value={selectedComp.id} />
                    <input type="hidden" name="jobRoleId" value={selectedJobRoleId} />
                    <input type="hidden" name="displayOrder" value={selectedComp.developmentProjects.length} />
                    <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Add Project</p>
                    <div>
                      <label className={labelCls}>Title</label>
                      <input name="title" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>What to do</label>
                      <textarea name="whatToDo" rows={2} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>How to do it</label>
                      <textarea name="howToDoIt" rows={2} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Evidence</label>
                      <textarea name="evidence" rows={2} className={inputCls} />
                    </div>
                    <button type="submit" className={btnPrimary}>Add Project</button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className={`${card} px-5 py-10 text-center`}>
              <p className="text-sm text-[#64748B]">Select a competency to edit its report content.</p>
            </div>
          )}
        </div>
      )}

      {!selectedJobRoleId && tab !== "roles" && (
        <div className={`${card} px-5 py-10 text-center`}>
          <p className="text-sm text-[#64748B]">Create a Job Role first, then come back to this tab.</p>
        </div>
      )}
    </div>
  );
}
