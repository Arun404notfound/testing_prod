import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, Layers, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function nextLikertDisplayOrder(): Promise<number> {
  const agg = await prisma.assessmentItem.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  return (agg._max.displayOrder ?? 0) + 1;
}

async function nextTriadDisplayOrder(): Promise<number> {
  const agg = await prisma.triadGroup.aggregate({
    where: { sectionId: null },
    _max: { displayOrder: true },
  });
  return (agg._max.displayOrder ?? 0) + 1;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createLikertQuestion(formData: FormData) {
  "use server";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const factor = String(formData.get("factor") ?? "").trim();
  const trait = String(formData.get("trait") ?? "").trim();
  const polarity = String(formData.get("polarity") ?? "POSITIVE") as "POSITIVE" | "NEGATIVE";
  const attributeId = String(formData.get("attributeId") ?? "").trim() || null;

  if (!prompt || !factor || !trait) redirect("/admin/questions?tab=likert&status=error&reason=missing");

  const displayOrder = await nextLikertDisplayOrder();

  try {
    await prisma.assessmentItem.create({
      data: {
        itemType: "LIKERT",
        prompt,
        factor,
        trait,
        definition: trait,
        polarity,
        attributeId: attributeId || undefined,
        displayOrder,
      },
    });
  } catch {
    redirect("/admin/questions?tab=likert&status=error&reason=db");
  }
  redirect("/admin/questions?tab=likert&status=success");
}

async function deleteLikertItem(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentItem.delete({ where: { id } }).catch(() => {});
  redirect("/admin/questions?tab=likert");
}

async function createTriadGroup(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const tenantId = await getDefaultTenantId();

  const stmts = [0, 1, 2].map((i) => ({
    text: String(formData.get(`stmt_${i}_text`) ?? "").trim(),
    attributeId: String(formData.get(`stmt_${i}_attributeId`) ?? "").trim() || null,
    polarity: (String(formData.get(`stmt_${i}_polarity`) ?? "POSITIVE")) as "POSITIVE" | "NEGATIVE",
    factor: String(formData.get(`stmt_${i}_factor`) ?? "").trim(),
    trait: String(formData.get(`stmt_${i}_trait`) ?? "").trim(),
  }));

  if (!title || stmts.some((s) => !s.text)) {
    redirect("/admin/questions?tab=triad&status=error&reason=missing");
  }

  const displayOrder = await nextTriadDisplayOrder();

  try {
    await prisma.triadGroup.create({
      data: {
        tenantId,
        title,
        displayOrder,
        statements: {
          create: stmts.map((s, i) => ({
            statementText: s.text,
            displayOrder: i,
            factor: s.factor || "General",
            trait: s.trait || s.text.slice(0, 30),
            definition: s.trait || s.text.slice(0, 30),
            polarity: s.polarity,
            attributeId: s.attributeId || undefined,
          })),
        },
      },
    });
  } catch {
    redirect("/admin/questions?tab=triad&status=error&reason=db");
  }
  redirect("/admin/questions?tab=triad&status=success");
}

async function deleteTriadGroup(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.triadGroup.delete({ where: { id } }).catch(() => {});
  redirect("/admin/questions?tab=triad");
}

async function updateItemAttribute(formData: FormData) {
  "use server";
  const itemId = String(formData.get("itemId") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  if (!itemId) redirect("/admin/questions?tab=likert");
  let saved = false;
  try {
    await prisma.assessmentItem.update({
      where: { id: itemId },
      data: { attributeId: attributeId || null },
    });
    saved = true;
  } catch { /* swallow — redirect below carries the status */ }
  redirect(`/admin/questions?tab=likert&status=${saved ? "success" : "error"}&reason=db`);
}

async function updateStatementAttribute(formData: FormData) {
  "use server";
  const statementId = String(formData.get("statementId") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  if (!statementId) redirect("/admin/questions?tab=triad");
  let saved = false;
  try {
    // When an attribute is selected, sync the trait text + Big 5 factor to match
    // so the left-side metadata always reflects the saved attribute.
    const attr = attributeId
      ? await prisma.attribute.findUnique({
          where: { id: attributeId },
          select: { name: true, category: true },
        })
      : null;
    await prisma.triadStatement.update({
      where: { id: statementId },
      data: {
        attributeId: attributeId || null,
        ...(attr ? { trait: attr.name, factor: attr.category ?? undefined } : {}),
      },
    });
    saved = true;
  } catch { /* swallow — redirect below carries the status */ }
  redirect(`/admin/questions?tab=triad&status=${saved ? "success" : "error"}&reason=db`);
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const card = "rounded-xl border border-[#E2E8F0] bg-white overflow-hidden";
const cardHeader = "border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3";
const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none";
const selectCls = "w-full rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#334155] focus:border-[#1D4ED8] focus:outline-none";
const saveBtnCls = "rounded-lg bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af] transition shrink-0";
const POLARITY_COLORS: Record<string, string> = {
  POSITIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NEGATIVE: "bg-rose-50 text-rose-600 border-rose-200",
};
const BIG_FIVE_FACTORS = ["Extraversion", "Agreeableness", "Conscientiousness", "Neuroticism", "Openness"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; reason?: string; addLikert?: string; addTriad?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "likert";
  const addLikertOpen = sp.addLikert === "1";
  const addTriadOpen = sp.addTriad === "1";
  const tenantId = await getDefaultTenantId();

  const [likertItems, triadGroups, attributes, competencies, mappings] = await Promise.all([
    prisma.assessmentItem.findMany({
      where: { itemType: "LIKERT" },
      include: {
        attribute: { include: { competencyMaps: { include: { competency: true } } } },
        section: { select: { title: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.triadGroup.findMany({
      where: { tenantId },
      include: {
        statements: {
          include: { attribute: { include: { competencyMaps: { include: { competency: true } } } } },
          orderBy: { displayOrder: "asc" },
        },
        section: { select: { title: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.attribute.findMany({ where: { tenantId }, orderBy: { code: "asc" } }),
    prisma.competency.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.attributeCompetencyMap.findMany({ include: { attribute: true, competency: true } }),
  ]);

  const allStatements = triadGroups.flatMap((g) => g.statements);

  const tabs = [
    { id: "likert", label: `Likert Items (${likertItems.length})` },
    { id: "triad", label: `Triad Groups (${triadGroups.length})` },
    { id: "chain", label: "Scoring Chain" },
  ];

  const attrOptions = (
    <>
      <option value="">— No attribute —</option>
      {attributes.map((a) => (
        <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
      ))}
    </>
  );

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title="Question Bank"
        subtitle="Add, edit, and link all psychometric questions to attributes."
        right={
          <Link href="/admin/competencies" className="tg-button-primary text-sm">
            Manage Attributes & Competencies →
          </Link>
        }
      />

      {/* Status banners */}
      {sp.status === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Saved successfully.</div>
      )}
      {sp.status === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {sp.reason === "missing" ? "Please fill in all required fields." : sp.reason === "no_assessment" ? "No base assessment found. Seed the database first." : "Something went wrong — please try again."}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Likert Questions", value: likertItems.length, icon: BookOpen, color: "text-[#1D4ED8]", bg: "bg-[#EFF6FF]" },
          { label: "Triad Groups", value: triadGroups.length, sub: `${allStatements.length} statements`, icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Attributes", value: attributes.length, icon: Brain, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Competencies", value: competencies.length, sub: `${mappings.length} mappings`, icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-xs font-semibold text-[#334155]">{s.label}</p>
              {"sub" in s && s.sub && <p className="mt-0.5 text-[11px] text-[#94A3B8]">{s.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Flow chain */}
      <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-5 py-3 text-xs">
        {["Question", "Attribute", "Competency", "Score (via Formula)"].map((label, i, arr) => (
          <span key={label} className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 font-semibold ${i === 0 ? "bg-[#EFF6FF] text-[#1D4ED8]" : i === 1 ? "bg-purple-50 text-purple-600" : i === 2 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {label}
            </span>
            {i < arr.length - 1 && <ArrowRight size={14} className="text-[#94A3B8]" />}
          </span>
        ))}
        <span className="ml-auto text-[#94A3B8]">
          Change formula at{" "}
          <Link href="/admin/competencies?tab=competencies" className="text-[#1D4ED8] hover:underline">Competencies</Link>
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <Link key={t.id} href={`/admin/questions?tab=${t.id}`}
              className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${tab === t.id ? "border-[#1D4ED8] text-[#1D4ED8]" : "border-transparent text-[#64748B] hover:text-[#334155]"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── LIKERT TAB ──────────────────────────────────────────────────────────── */}
      {tab === "likert" && (
        <div className="space-y-4">
          {/* Add form toggle */}
          {!addLikertOpen ? (
            <Link href="/admin/questions?tab=likert&addLikert=1"
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-medium text-[#475569] transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]">
              <Plus size={16} /> Add New Likert Question
            </Link>
          ) : (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <p className="text-sm font-semibold text-[#0F172A]">Add New Likert Question</p>
                <Link href="/admin/questions?tab=likert" className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={createLikertQuestion} className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Question / Statement *</label>
                  <input name="prompt" required placeholder="e.g. I enjoy meeting new people and thrive in social settings." className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Big Five Factor *</label>
                  <select name="factor" required className={inputCls}>
                    <option value="">Select factor…</option>
                    {BIG_FIVE_FACTORS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute *</label>
                  <input name="trait" required placeholder="e.g. Sociability" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Polarity *</label>
                  <select name="polarity" className={inputCls}>
                    <option value="POSITIVE">Positive (score as-is)</option>
                    <option value="NEGATIVE">Negative (reverse scored)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Link to Attribute</label>
                  <select name="attributeId" className={inputCls}>
                    {attrOptions}
                  </select>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href="/admin/questions?tab=likert" className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]">
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Question list */}
          <div className={card}>
            <div className={cardHeader}>
              <p className="text-sm font-semibold text-[#0F172A]">Likert Scale Questions</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Each question measures one attribute. Use the dropdown to link or change the attribute.</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {likertItems.map((item, idx) => {
                const competencyLinks = item.attribute?.competencyMaps ?? [];
                return (
                  <div key={item.id} className="px-5 py-4 sm:flex sm:items-start sm:gap-4">
                    <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] leading-snug">{item.prompt}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">{item.section?.title ?? "—"}</span>
                        {item.polarity && (
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${POLARITY_COLORS[item.polarity] ?? ""}`}>{item.polarity}</span>
                        )}
                        {item.factor && <span className="text-[10px] text-[#94A3B8]">Big 5: {item.factor}</span>}
                        {item.trait && <span className="text-[10px] text-[#94A3B8]">· Attribute: {item.trait}</span>}
                        {competencyLinks.length > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            → {competencyLinks.map((m) => m.competency.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                      <form key={item.attributeId ?? "none"} action={updateItemAttribute} className="flex flex-1 items-center gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <select name="attributeId" defaultValue={item.attributeId ?? ""} className={selectCls}>{attrOptions}</select>
                        <button type="submit" className={saveBtnCls}>Save</button>
                      </form>
                      <form action={deleteLikertItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
              {likertItems.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-[#64748B]">No Likert items yet. Add one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TRIAD TAB ─────────────────────────────────────────────────────────── */}
      {tab === "triad" && (
        <div className="space-y-4">
          {/* Add form toggle */}
          {!addTriadOpen ? (
            <Link href="/admin/questions?tab=triad&addTriad=1"
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-medium text-[#475569] transition hover:border-purple-400 hover:text-purple-600">
              <Plus size={16} /> Add New Triad Group
            </Link>
          ) : (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Add New Triad Group</p>
                  <p className="text-[11px] text-[#64748B]">A triad group has one situational prompt and 3 response statements (A, B, C).</p>
                </div>
                <Link href="/admin/questions?tab=triad" className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={createTriadGroup} className="space-y-5 p-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Situational Prompt / Group Title *</label>
                  <input name="title" required placeholder="e.g. In a new team situation…" className={inputCls} />
                </div>

                {/* 3 statement rows */}
                {[0, 1, 2].map((i) => {
                  const letter = ["A", "B", "C"][i];
                  return (
                    <div key={i} className="rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                      <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Statement {letter}</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#475569]">Statement text *</label>
                        <input name={`stmt_${i}_text`} required placeholder={`Statement ${letter}…`} className={inputCls} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-[#475569]">Link to Attribute</label>
                          <select name={`stmt_${i}_attributeId`} className={inputCls}>{attrOptions}</select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#475569]">Big 5</label>
                          <select name={`stmt_${i}_factor`} className={inputCls}>
                            <option value="">Select…</option>
                            {BIG_FIVE_FACTORS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#475569]">Polarity</label>
                          <select name={`stmt_${i}_polarity`} className={inputCls}>
                            <option value="POSITIVE">Positive</option>
                            <option value="NEGATIVE">Negative</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute (optional)</label>
                        <input name={`stmt_${i}_trait`} placeholder="e.g. Trust, Sociability…" className={inputCls} />
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href="/admin/questions?tab=triad" className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                    Add Triad Group
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Triad group list */}
          {triadGroups.map((group, gi) => (
            <div key={group.id} className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Group {gi + 1}: {group.title}</p>
                  <p className="text-[11px] text-[#94A3B8]">Section: {group.section?.title ?? "—"} · {group.statements.length} statements</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">Triad</span>
                  <form action={deleteTriadGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete group">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {group.statements.map((stmt, si) => {
                  const letter = ["A", "B", "C"][si] ?? String(si + 1);
                  const competencyLinks = stmt.attribute?.competencyMaps ?? [];
                  return (
                    <div key={stmt.id} className="px-5 py-3.5 sm:flex sm:items-start sm:gap-4">
                      <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-lg bg-purple-50 text-[11px] font-bold text-purple-600">{letter}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#0F172A] leading-snug">{stmt.statementText}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {stmt.polarity && <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${POLARITY_COLORS[stmt.polarity] ?? ""}`}>{stmt.polarity}</span>}
                          <span className="text-[10px] text-[#94A3B8]">Big 5: {stmt.factor} · Attribute: {stmt.trait}</span>
                          {competencyLinks.length > 0 && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              → {competencyLinks.map((m) => m.competency.name).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <form key={stmt.attributeId ?? "none"} action={updateStatementAttribute} className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                        <input type="hidden" name="statementId" value={stmt.id} />
                        <select name="attributeId" defaultValue={stmt.attributeId ?? ""} className={selectCls}>{attrOptions}</select>
                        <button type="submit" className={saveBtnCls}>Save</button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {triadGroups.length === 0 && (
            <div className={`${card} px-5 py-10 text-center text-sm text-[#64748B]`}>No triad groups yet. Add one above.</div>
          )}
        </div>
      )}

      {/* ── SCORING CHAIN TAB ─────────────────────────────────────────────────── */}
      {tab === "chain" && (
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">Full scoring flow — from question → attribute → competency → score via formula.</p>
          {competencies.map((comp) => {
            const compMaps = mappings.filter((m) => m.competencyId === comp.id);
            const compAttrIds = new Set(compMaps.map((m) => m.attributeId));
            const likertForComp = likertItems.filter((i) => i.attributeId && compAttrIds.has(i.attributeId));
            const stmtsForComp = allStatements.filter((s) => s.attributeId && compAttrIds.has(s.attributeId));
            return (
              <div key={comp.id} className={card}>
                <div className="border-b border-[#E2E8F0] bg-gradient-to-r from-[#EFF6FF] to-white px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-[#0F172A]">{comp.name}</p>
                      {comp.description && <p className="mt-0.5 text-xs text-[#64748B]">{comp.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#1D4ED8]">{compMaps.length} attributes</span>
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] text-[#475569]">Formula: {comp.scoringFormula.replace("_", " ")}</span>
                      <Link href="/admin/competencies?tab=competencies" className="text-[11px] text-[#1D4ED8] hover:underline">Edit formula →</Link>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[#F8FAFC]">
                  {compMaps.map((map) => {
                    const attr = map.attribute;
                    const attrLikert = likertForComp.filter((i) => i.attributeId === attr.id);
                    const attrStmts = stmtsForComp.filter((s) => s.attributeId === attr.id);
                    const total = attrLikert.length + attrStmts.length;
                    return (
                      <div key={map.id} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-purple-600">[{attr.code}]</span>
                          <span className="text-sm font-semibold text-[#0F172A]">{attr.name}</span>
                          {attr.category && <span className="text-xs text-[#94A3B8]">· {attr.category}</span>}
                          <span className="ml-auto rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#475569]">w:{map.weight}</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-[#1D4ED8]">{total} questions</span>
                        </div>
                        {total > 0 && (
                          <div className="mt-2 ml-8 space-y-1">
                            {[...attrLikert.slice(0, 2).map((i) => ({ text: i.prompt, type: "L" })), ...attrStmts.slice(0, 2).map((s) => ({ text: s.statementText, type: "T" }))].map((item, ii) => (
                              <p key={ii} className="flex items-start gap-1.5 text-xs text-[#64748B]">
                                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${item.type === "L" ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-purple-50 text-purple-600"}`}>{item.type}</span>
                                {item.text.slice(0, 80)}{item.text.length > 80 ? "…" : ""}
                              </p>
                            ))}
                            {total > 4 && <p className="text-[11px] text-[#94A3B8]">…and {total - 4} more</p>}
                          </div>
                        )}
                        {total === 0 && <p className="ml-8 mt-1 text-xs text-amber-600">⚠ No questions linked to this attribute yet.</p>}
                      </div>
                    );
                  })}
                  {compMaps.length === 0 && (
                    <div className="px-5 py-4 text-sm text-amber-600">⚠ No attributes mapped. <Link href="/admin/competencies?tab=mappings" className="underline">Add mappings →</Link></div>
                  )}
                </div>
                <div className="border-t border-[#F1F5F9] bg-[#F8FAFC] px-5 py-3 flex gap-6 text-xs text-[#64748B]">
                  <span><span className="font-semibold text-[#0F172A]">{likertForComp.length}</span> Likert</span>
                  <span><span className="font-semibold text-[#0F172A]">{stmtsForComp.length}</span> Triad statements</span>
                  <span><span className="font-semibold text-[#0F172A]">{likertForComp.length + stmtsForComp.length}</span> total</span>
                </div>
              </div>
            );
          })}
          {competencies.length === 0 && (
            <div className={`${card} px-5 py-10 text-center`}>
              <p className="text-sm text-[#64748B]">No competencies yet.</p>
              <Link href="/admin/competencies" className="mt-3 inline-block text-sm font-medium text-[#1D4ED8] hover:underline">Set up competencies →</Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
