import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import {
  SCORING_FORMULA_LABELS,
  SCORING_FORMULA_DESCRIPTIONS,
} from "@/lib/scoring/competencyEngine";

async function updateAttribute(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!id || !code || !name) redirect("/admin/competencies?tab=attributes&status=error");
  try {
    await prisma.attribute.update({
      where: { id },
      data: { code, name, description: description || null, category: category || null },
    });
  } catch { redirect("/admin/competencies?tab=attributes&status=error"); }
  revalidatePath("/admin/competencies");
  redirect("/admin/competencies?tab=attributes&status=success");
}

async function updateCompetency(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reportDescription = String(formData.get("reportDescription") ?? "").trim();
  if (!id || !name) redirect("/admin/competencies?tab=competencies&status=error");
  try {
    await prisma.competency.update({
      where: { id },
      data: { name, description: description || null, reportDescription: reportDescription || null },
    });
  } catch { redirect("/admin/competencies?tab=competencies&status=error"); }
  revalidatePath("/admin/competencies");
  redirect("/admin/competencies?tab=competencies&status=success");
}

// ─── Server Actions ──────────────────────────────────────────────────────────

async function createAttribute(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!code || !name) redirect("/admin/competencies?tab=attributes&status=error");
  try {
    await prisma.attribute.create({
      data: { tenantId, code, name, description: description || null, category: category || null },
    });
  } catch { redirect("/admin/competencies?tab=attributes&status=error"); }
  revalidatePath("/admin/competencies");
  redirect("/admin/competencies?tab=attributes&status=success");
}

async function deleteAttribute(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.attribute.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/competencies");
}

async function createCompetency(formData: FormData) {
  "use server";
  const tenantId = await getDefaultTenantId();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reportDescription = String(formData.get("reportDescription") ?? "").trim();
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  if (!name) redirect("/admin/competencies?tab=competencies&status=error");
  try {
    await prisma.competency.create({
      data: {
        tenantId,
        name,
        description: description || null,
        reportDescription: reportDescription || null,
        scoringFormula,
      },
    });
  } catch { redirect("/admin/competencies?tab=competencies&status=error"); }
  revalidatePath("/admin/competencies");
  redirect("/admin/competencies?tab=competencies&status=success");
}

async function updateCompetencyFormula(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  const scoringFormula = String(formData.get("scoringFormula") ?? "WEIGHTED_AVERAGE").trim();
  if (!id) return;
  await prisma.competency.update({ where: { id }, data: { scoringFormula } }).catch(() => {});
  revalidatePath("/admin/competencies");
}

async function deleteCompetency(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.competency.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/competencies");
}

async function createMapping(formData: FormData) {
  "use server";
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  const competencyId = String(formData.get("competencyId") ?? "").trim();
  const weight = parseFloat(String(formData.get("weight") ?? "1"));
  if (!attributeId || !competencyId) redirect("/admin/competencies?tab=mappings&status=error");
  try {
    await prisma.attributeCompetencyMap.upsert({
      where: { attributeId_competencyId: { attributeId, competencyId } },
      create: { attributeId, competencyId, weight: isFinite(weight) ? weight : 1 },
      update: { weight: isFinite(weight) ? weight : 1 },
    });
  } catch { redirect("/admin/competencies?tab=mappings&status=error"); }
  revalidatePath("/admin/competencies");
  redirect("/admin/competencies?tab=mappings&status=success");
}

async function deleteMapping(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.attributeCompetencyMap.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/competencies");
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none";
const labelCls = "block text-xs font-medium text-[#475569] mb-1";
const btnPrimary = "rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50";
const btnDanger = "text-xs text-red-500 hover:underline";
const card = "rounded-xl border border-[#E2E8F0] bg-white";
const cardHeader = "border-b border-[#E2E8F0] px-5 py-4";

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CompetenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; editAttrId?: string; editCompId?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "attributes";
  const status = sp.status;
  const editAttrId = sp.editAttrId ?? null;
  const editCompId = sp.editCompId ?? null;
  const tenantId = await getDefaultTenantId();

  const [attributes, competencies, mappings] = await Promise.all([
    prisma.attribute.findMany({ where: { tenantId }, orderBy: { code: "asc" } }),
    prisma.competency.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.attributeCompetencyMap.findMany({
      include: { attribute: true, competency: true },
      orderBy: { competency: { name: "asc" } },
    }),
  ]);

  const tabs = [
    { id: "attributes", label: `Attributes (${attributes.length})` },
    { id: "competencies", label: `Competencies (${competencies.length})` },
    { id: "mappings", label: `Mappings (${mappings.length})` },
    { id: "formulas", label: "Scoring Formulas" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F172A]">Competency Engine</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Define attributes, competencies, and their mappings. Scores are computed automatically from candidate responses.
        </p>
      </div>

      {/* Status banners */}
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

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`/admin/competencies?tab=${t.id}`}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-[#1D4ED8] text-[#1D4ED8]"
                  : "border-transparent text-[#64748B] hover:text-[#334155]"
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ── Attributes tab ── */}
      {tab === "attributes" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add / Edit form */}
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">{editAttrId ? "Edit Attribute" : "Add Attribute"}</h2>
              {editAttrId && (
                <a href="/admin/competencies?tab=attributes" className="mt-1 block text-xs text-[#94A3B8] hover:text-[#334155]">← Cancel edit</a>
              )}
            </div>
            {(() => {
              const editing = editAttrId ? attributes.find((a) => a.id === editAttrId) : null;
              return (
                <form action={editing ? updateAttribute : createAttribute} className="space-y-4 p-5">
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                  <div>
                    <label className={labelCls}>Code (e.g. A1) *</label>
                    <input name="code" required defaultValue={editing?.code ?? ""} placeholder="A1" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Attribute Name *</label>
                    <input name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. Assertiveness" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Category (optional)</label>
                    <input name="category" defaultValue={editing?.category ?? ""} placeholder="e.g. Interpersonal" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Description (optional)</label>
                    <input name="description" defaultValue={editing?.description ?? ""} placeholder="Brief description..." className={inputCls} />
                  </div>
                  <button type="submit" className={btnPrimary}>{editing ? "Save Changes" : "Add Attribute"}</button>
                </form>
              );
            })()}
          </div>

          {/* Table */}
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">Attributes ({attributes.length})</h2>
            </div>
            {attributes.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#64748B]">No attributes yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F1F5F9] text-left text-xs text-[#94A3B8]">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F8FAFC]">
                  {attributes.map((a) => (
                    <tr key={a.id} className={editAttrId === a.id ? "bg-[#EFF6FF]" : ""}>
                      <td className="px-5 py-3 font-mono text-xs font-bold text-[#1D4ED8]">{a.code}</td>
                      <td className="px-5 py-3 font-medium text-[#0F172A]">{a.name}</td>
                      <td className="px-5 py-3 text-xs text-[#64748B]">{a.category ?? "—"}</td>
                      <td className="px-5 py-3 flex items-center gap-3">
                        <a href={`/admin/competencies?tab=attributes&editAttrId=${a.id}`} className="text-xs text-[#1D4ED8] hover:underline">Edit</a>
                        <form action={deleteAttribute}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className={btnDanger}>Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Competencies tab ── */}
      {tab === "competencies" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">Add Competency</h2>
            </div>
            <form action={createCompetency} className="space-y-4 p-5">
              <div>
                <label className={labelCls}>Competency Name *</label>
                <input name="name" required placeholder="e.g. Leadership" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Scoring Formula *</label>
                <select name="scoringFormula" className={inputCls} defaultValue="WEIGHTED_AVERAGE">
                  {Object.entries(SCORING_FORMULA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  See the <a href="/admin/competencies?tab=formulas" className="underline">Scoring Formulas</a> tab for a description of each option.
                </p>
              </div>
              <div>
                <label className={labelCls}>Internal Description (optional)</label>
                <input name="description" placeholder="Admin reference..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Report Description (optional)</label>
                <textarea
                  name="reportDescription"
                  rows={3}
                  placeholder="Text shown on the report for this competency..."
                  className={inputCls}
                />
              </div>
              <button type="submit" className={btnPrimary}>Add Competency</button>
            </form>
          </div>

          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">Competencies ({competencies.length})</h2>
            </div>
            {competencies.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#64748B]">No competencies yet.</p>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {competencies.map((c) => {
                  const mappedCount = mappings.filter((m) => m.competencyId === c.id).length;
                  const isEditing = editCompId === c.id;
                  return (
                    <div key={c.id} className={`px-5 py-4 space-y-3 ${isEditing ? "bg-[#EFF6FF]" : ""}`}>
                      {isEditing ? (
                        /* Inline edit form */
                        <form action={updateCompetency} className="space-y-3">
                          <input type="hidden" name="id" value={c.id} />
                          <div>
                            <label className={labelCls}>Competency Name *</label>
                            <input name="name" required defaultValue={c.name} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Internal Description</label>
                            <input name="description" defaultValue={c.description ?? ""} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Report Description</label>
                            <textarea name="reportDescription" rows={2} defaultValue={c.reportDescription ?? ""} className={inputCls} />
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="submit" className="rounded bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]">Save</button>
                            <a href="/admin/competencies?tab=competencies" className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</a>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A]">{c.name}</p>
                              {c.description && <p className="mt-0.5 text-xs text-[#64748B]">{c.description}</p>}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#1D4ED8]">{mappedCount} attribute{mappedCount !== 1 ? "s" : ""} mapped</span>
                                <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">{SCORING_FORMULA_LABELS[c.scoringFormula] ?? c.scoringFormula}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <a href={`/admin/competencies?tab=competencies&editCompId=${c.id}`} className="text-xs text-[#1D4ED8] hover:underline">Edit</a>
                              <form action={deleteCompetency}>
                                <input type="hidden" name="id" value={c.id} />
                                <button type="submit" className={btnDanger}>Delete</button>
                              </form>
                            </div>
                          </div>
                          {/* Inline formula change */}
                          <form action={updateCompetencyFormula} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={c.id} />
                            <label className="text-xs text-[#64748B] whitespace-nowrap">Formula:</label>
                            <select name="scoringFormula" defaultValue={c.scoringFormula} className="flex-1 rounded border border-[#E2E8F0] px-2 py-1 text-xs text-[#334155] focus:outline-none">
                              {Object.entries(SCORING_FORMULA_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <button type="submit" className="rounded bg-[#1D4ED8] px-3 py-1 text-xs font-medium text-white hover:bg-[#1e40af]">Save</button>
                          </form>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Formulas tab ── */}
      {tab === "formulas" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4">
            <p className="text-sm text-[#334155]">
              Each competency uses one of the formulas below to combine the scores of its mapped attributes into a single 1–10 score.
              Choose the formula that best reflects how you want a weakness in one attribute to affect the overall competency score.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(SCORING_FORMULA_DESCRIPTIONS).map(([key, desc]) => (
              <div key={key} className={`${card} flex flex-col`}>
                <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#1D4ED8] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {key.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[#0F172A]">
                    {SCORING_FORMULA_LABELS[key]}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <p className="text-sm text-[#334155]">{desc.summary}</p>
                  <div className="rounded-lg bg-[#F1F5F9] px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Formula</p>
                    <p className="mt-0.5 font-mono text-sm text-[#0F172A]">{desc.formula}</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Use Case</p>
                    <p className="mt-0.5 text-xs text-[#475569]">{desc.useCase}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mappings tab ── */}
      {tab === "mappings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Map form */}
          <div className={card}>
            <div className={cardHeader}>
              <h2 className="text-sm font-semibold text-[#0F172A]">Map Attribute → Competency</h2>
            </div>
            <form action={createMapping} className="space-y-4 p-5">
              <div>
                <label className={labelCls}>Attribute *</label>
                <select name="attributeId" required className={inputCls}>
                  <option value="">Select attribute...</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Competency *</label>
                <select name="competencyId" required className={inputCls}>
                  <option value="">Select competency...</option>
                  {competencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Weight (default 1.0)</label>
                <input name="weight" type="number" step="0.1" min="0.1" defaultValue="1.0" className={inputCls} />
              </div>
              {(attributes.length === 0 || competencies.length === 0) && (
                <p className="text-xs text-amber-600">⚠ Add at least one attribute and one competency first.</p>
              )}
              <button type="submit" disabled={attributes.length === 0 || competencies.length === 0} className={btnPrimary}>
                Save Mapping
              </button>
            </form>
          </div>

          {/* Mappings list + competency summary */}
          <div className="space-y-4">
            <div className={card}>
              <div className={cardHeader}>
                <h2 className="text-sm font-semibold text-[#0F172A]">Current Mappings ({mappings.length})</h2>
              </div>
              {mappings.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[#64748B]">No mappings yet.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {mappings.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded bg-[#EFF6FF] px-2 py-0.5 font-mono text-xs font-bold text-[#1D4ED8]">
                          {m.attribute.code}
                        </span>
                        <span className="text-[#334155]">{m.attribute.name}</span>
                        <span className="text-[#94A3B8]">→</span>
                        <span className="font-medium text-[#0F172A]">{m.competency.name}</span>
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]">w={m.weight}</span>
                      </div>
                      <form action={deleteMapping}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className={btnDanger}>Remove</button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-competency attribute summary */}
            {competencies.length > 0 && (
              <div className={card}>
                <div className={cardHeader}>
                  <h2 className="text-sm font-semibold text-[#0F172A]">Competency Summary</h2>
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {competencies.map((c) => {
                    const cMaps = mappings.filter((m) => m.competencyId === c.id);
                    return (
                      <div key={c.id} className="px-5 py-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium text-[#0F172A]">{c.name}</span>
                          <span className="text-xs text-[#64748B]">{cMaps.length} attribute{cMaps.length !== 1 ? "s" : ""}</span>
                        </div>
                        {cMaps.length === 0 ? (
                          <p className="text-xs text-amber-600">No attributes mapped yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {cMaps.map((m) => (
                              <span key={m.id} className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-0.5 text-xs text-[#1D4ED8]">
                                {m.attribute.code}: {m.attribute.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
