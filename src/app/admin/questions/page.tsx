import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Brain, CheckCircle2, ChevronDown, Layers, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { CaseStudyForm } from "./case-study-form";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shared by any bank-level (unsectioned) AssessmentItem — Likert, SJT, etc. */
async function nextBankItemDisplayOrder(): Promise<number> {
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

async function nextCaseStudyDisplayOrder(): Promise<number> {
  const agg = await prisma.caseStudy.aggregate({
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
  const polarity = String(formData.get("polarity") ?? "POSITIVE") as "POSITIVE" | "NEGATIVE";
  const attributeId = String(formData.get("attributeId") ?? "").trim();

  if (!prompt || !factor || !attributeId) redirect("/admin/questions?tab=likert&status=error&reason=missing");

  const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, select: { name: true } });
  if (!attribute) redirect("/admin/questions?tab=likert&status=error&reason=missing");

  const displayOrder = await nextBankItemDisplayOrder();

  try {
    await prisma.assessmentItem.create({
      data: {
        itemType: "LIKERT",
        prompt,
        factor,
        trait: attribute.name,
        definition: attribute.name,
        polarity,
        attributeId,
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
    attributeId: String(formData.get(`stmt_${i}_attributeId`) ?? "").trim(),
    polarity: (String(formData.get(`stmt_${i}_polarity`) ?? "POSITIVE")) as "POSITIVE" | "NEGATIVE",
    factor: String(formData.get(`stmt_${i}_factor`) ?? "").trim(),
  }));

  if (!title || stmts.some((s) => !s.text || !s.attributeId)) {
    redirect("/admin/questions?tab=triad&status=error&reason=missing");
  }

  const attrs = await prisma.attribute.findMany({
    where: { id: { in: stmts.map((s) => s.attributeId) } },
    select: { id: true, name: true },
  });
  const attrNameById = new Map(attrs.map((a) => [a.id, a.name]));
  if (stmts.some((s) => !attrNameById.has(s.attributeId))) {
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
          create: stmts.map((s, i) => {
            const traitName = attrNameById.get(s.attributeId)!;
            return {
              statementText: s.text,
              displayOrder: i,
              factor: s.factor || "General",
              trait: traitName,
              definition: traitName,
              polarity: s.polarity,
              attributeId: s.attributeId,
            };
          }),
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

async function createSjtQuestion(formData: FormData) {
  "use server";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  const opts = [1, 2, 3, 4].map((n) => ({
    label: String(formData.get(`opt${n}_label`) ?? "").trim(),
    scoreValue: Number(formData.get(`opt${n}_score`)),
  }));

  if (
    !prompt || !attributeId ||
    opts.some((o) => !o.label || !Number.isFinite(o.scoreValue))
  ) {
    redirect("/admin/questions?tab=sjt&status=error&reason=missing");
  }

  const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, select: { name: true, category: true } });
  if (!attribute) redirect("/admin/questions?tab=sjt&status=error&reason=missing");

  const bestScore = Math.max(...opts.map((o) => o.scoreValue));
  const displayOrder = await nextBankItemDisplayOrder();

  try {
    await prisma.assessmentItem.create({
      data: {
        itemType: "SJT",
        prompt,
        factor: attribute.category || "General",
        trait: attribute.name,
        definition: attribute.name,
        attributeId,
        displayOrder,
        options: {
          create: opts.map((o, i) => ({
            label: o.label,
            value: o.label,
            displayOrder: i,
            // Best-scoring option flagged as "correct" for admin-review display only —
            // scoring itself uses each option's scoreValue directly (weighted partial credit).
            isCorrect: o.scoreValue === bestScore,
            scoreValue: o.scoreValue,
          })),
        },
      },
    });
  } catch {
    redirect("/admin/questions?tab=sjt&status=error&reason=db");
  }
  redirect("/admin/questions?tab=sjt&status=success");
}

async function deleteSjtItem(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.assessmentItem.delete({ where: { id } }).catch(() => {});
  redirect("/admin/questions?tab=sjt");
}

async function createCaseStudy(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const passageText = String(formData.get("passageText") ?? "").trim();

  // Sub-question count is admin-controlled (see CaseStudyForm's "Add
  // sub-question" button) rather than a fixed number, so read as many
  // `sub_${i}_*` groups as were actually submitted instead of assuming 3.
  const subs: Array<{ prompt: string; attributeId: string; options: string[]; correctOption: number }> = [];
  for (let i = 0; formData.has(`sub_${i}_prompt`); i++) {
    subs.push({
      prompt: String(formData.get(`sub_${i}_prompt`) ?? "").trim(),
      attributeId: String(formData.get(`sub_${i}_attributeId`) ?? "").trim(),
      options: [1, 2, 3, 4].map((n) => String(formData.get(`sub_${i}_option${n}`) ?? "").trim()),
      correctOption: Number(formData.get(`sub_${i}_correctOption`)),
    });
  }

  if (
    !title || !passageText || subs.length === 0 ||
    subs.some(
      (s) =>
        !s.prompt || !s.attributeId || s.options.some((o) => !o) ||
        !Number.isInteger(s.correctOption) || s.correctOption < 1 || s.correctOption > 4,
    )
  ) {
    redirect("/admin/questions?tab=case_study&status=error&reason=missing");
  }

  const attrs = await prisma.attribute.findMany({
    where: { id: { in: subs.map((s) => s.attributeId) } },
    select: { id: true, name: true, category: true },
  });
  const attrById = new Map(attrs.map((a) => [a.id, a]));
  if (subs.some((s) => !attrById.has(s.attributeId))) {
    redirect("/admin/questions?tab=case_study&status=error&reason=missing");
  }

  const tenantId = await getDefaultTenantId();
  const displayOrder = await nextCaseStudyDisplayOrder();

  try {
    await prisma.caseStudy.create({
      data: {
        tenantId,
        title,
        passageText,
        displayOrder,
        subQuestions: {
          create: subs.map((s, i) => {
            const attr = attrById.get(s.attributeId)!;
            return {
              itemType: "MCQ_SINGLE" as const,
              prompt: s.prompt,
              displayOrder: i,
              factor: attr.category || "General",
              trait: attr.name,
              definition: attr.name,
              attributeId: s.attributeId,
              options: {
                create: s.options.map((label, oi) => ({
                  label,
                  value: label,
                  displayOrder: oi,
                  isCorrect: oi + 1 === s.correctOption,
                })),
              },
            };
          }),
        },
      },
    });
  } catch {
    redirect("/admin/questions?tab=case_study&status=error&reason=db");
  }
  redirect("/admin/questions?tab=case_study&status=success");
}

async function deleteCaseStudy(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.caseStudy.delete({ where: { id } }).catch(() => {});
  redirect("/admin/questions?tab=case_study");
}

async function createMcqQuestion(formData: FormData) {
  "use server";
  const questionText = String(formData.get("questionText") ?? "").trim();
  const option1 = String(formData.get("option1") ?? "").trim();
  const option2 = String(formData.get("option2") ?? "").trim();
  const option3 = String(formData.get("option3") ?? "").trim();
  const option4 = String(formData.get("option4") ?? "").trim();
  const correctOption = Number(formData.get("correctOption"));
  const explanation = String(formData.get("explanation") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();

  if (
    !questionText || !attributeId ||
    !option1 || !option2 || !option3 || !option4 || !explanation ||
    !Number.isInteger(correctOption) || correctOption < 1 || correctOption > 4
  ) {
    redirect("/admin/questions?tab=mcq&status=error&reason=missing");
  }

  const attribute = await prisma.attribute.findUnique({ where: { id: attributeId }, select: { name: true, category: true } });
  if (!attribute) redirect("/admin/questions?tab=mcq&status=error&reason=missing");

  const tenantId = await getDefaultTenantId();
  try {
    await prisma.question.create({
      data: {
        tenantId,
        // Mirrors the linked attribute rather than free text — keeps this question
        // bank consistent with how Likert/Triad derive their section/category metadata.
        section: attribute.category || "General",
        category: attribute.name,
        questionText,
        option1,
        option2,
        option3,
        option4,
        correctOption,
        explanation,
        attributeId,
      },
    });
  } catch {
    redirect("/admin/questions?tab=mcq&status=error&reason=db");
  }
  redirect("/admin/questions?tab=mcq&status=success");
}

async function updateMcqAttribute(formData: FormData) {
  "use server";
  const questionId = String(formData.get("questionId") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  if (!questionId) redirect("/admin/questions?tab=mcq");
  let saved = false;
  try {
    const attribute = attributeId
      ? await prisma.attribute.findUnique({ where: { id: attributeId }, select: { name: true, category: true } })
      : null;
    await prisma.question.update({
      where: { id: questionId },
      data: {
        attributeId: attributeId || null,
        ...(attribute ? { category: attribute.name, section: attribute.category || "General" } : {}),
      },
    });
    saved = true;
  } catch { /* swallow — redirect below carries the status */ }
  redirect(`/admin/questions?tab=mcq&status=${saved ? "success" : "error"}&reason=db`);
}

async function deleteMcqQuestion(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.question.delete({ where: { id } }).catch(() => {});
  redirect("/admin/questions?tab=mcq");
}

async function updateItemAttribute(formData: FormData) {
  "use server";
  const itemId = String(formData.get("itemId") ?? "").trim();
  const attributeId = String(formData.get("attributeId") ?? "").trim();
  const tab = String(formData.get("tab") ?? "likert").trim() || "likert";
  if (!itemId) redirect(`/admin/questions?tab=${tab}`);
  let saved = false;
  try {
    await prisma.assessmentItem.update({
      where: { id: itemId },
      data: { attributeId: attributeId || null },
    });
    saved = true;
  } catch { /* swallow — redirect below carries the status */ }
  redirect(`/admin/questions?tab=${tab}&status=${saved ? "success" : "error"}&reason=db`);
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
const inputCls = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none";
const selectCls = "w-full rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#334155] focus:border-[#2563EB] focus:outline-none";
const saveBtnCls = "rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4edb] transition shrink-0";
const POLARITY_COLORS: Record<string, string> = {
  POSITIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NEGATIVE: "bg-rose-50 text-rose-600 border-rose-200",
};
const BIG_FIVE_FACTORS = ["Extraversion", "Agreeableness", "Conscientiousness", "Neuroticism", "Openness"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string; status?: string; reason?: string;
    addLikert?: string; addTriad?: string; addMcq?: string; addSjt?: string; addCaseStudy?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "likert";
  const addLikertOpen = sp.addLikert === "1";
  const addTriadOpen = sp.addTriad === "1";
  const addMcqOpen = sp.addMcq === "1";
  const addSjtOpen = sp.addSjt === "1";
  const addCaseStudyOpen = sp.addCaseStudy === "1";
  const tenantId = await getDefaultTenantId();

  const [likertItems, triadGroups, mcqQuestions, sjtItems, caseStudies, attributes, competencies, mappings] = await Promise.all([
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
    prisma.question.findMany({
      where: { tenantId },
      include: {
        attribute: { include: { competencyMaps: { include: { competency: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.assessmentItem.findMany({
      where: { itemType: "SJT" },
      include: {
        attribute: { include: { competencyMaps: { include: { competency: true } } } },
        section: { select: { title: true } },
        options: { orderBy: { displayOrder: "asc" } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.caseStudy.findMany({
      where: { tenantId },
      include: {
        section: { select: { title: true } },
        subQuestions: {
          include: {
            attribute: { include: { competencyMaps: { include: { competency: true } } } },
            options: { orderBy: { displayOrder: "asc" } },
          },
          orderBy: { displayOrder: "asc" },
        },
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
    { id: "mcq", label: `MCQ Questions (${mcqQuestions.length})` },
    { id: "sjt", label: `SJT Items (${sjtItems.length})` },
    { id: "case_study", label: `Case Studies (${caseStudies.length})` },
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
          { label: "Likert Questions", value: likertItems.length, icon: BookOpen, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
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
            <span className={`rounded-full px-3 py-1 font-semibold ${i === 0 ? "bg-[#EFF6FF] text-[#2563EB]" : i === 1 ? "bg-purple-50 text-purple-600" : i === 2 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {label}
            </span>
            {i < arr.length - 1 && <ArrowRight size={14} className="text-[#94A3B8]" />}
          </span>
        ))}
        <span className="ml-auto text-[#94A3B8]">
          Change formula at{" "}
          <Link href="/admin/competencies?tab=competencies" className="text-[#0F766E] hover:underline">Competencies</Link>
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <Link key={t.id} href={`/admin/questions?tab=${t.id}`}
              className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${tab === t.id ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"}`}>
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
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-medium text-[#475569] transition hover:border-[#2563EB] hover:text-[#2563EB]">
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
                  <select name="attributeId" required defaultValue="" className={inputCls}>
                    {attrOptions}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Polarity *</label>
                  <select name="polarity" className={inputCls}>
                    <option value="POSITIVE">Positive (score as-is)</option>
                    <option value="NEGATIVE">Negative (reverse scored)</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href="/admin/questions?tab=likert" className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4edb]">
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
                        {item.trait && <span className="text-[10px] text-[#94A3B8]">Attribute: {item.trait}</span>}
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
                          <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute *</label>
                          <select name={`stmt_${i}_attributeId`} required defaultValue="" className={inputCls}>{attrOptions}</select>
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
                  return (
                    <div key={stmt.id} className="px-5 py-3.5 sm:flex sm:items-start sm:gap-4">
                      <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-lg bg-purple-50 text-[11px] font-bold text-purple-600">{letter}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#0F172A] leading-snug">{stmt.statementText}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {stmt.polarity && <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${POLARITY_COLORS[stmt.polarity] ?? ""}`}>{stmt.polarity}</span>}
                          <span className="text-[10px] text-[#94A3B8]">Attribute: {stmt.trait}</span>
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

      {/* ── MCQ TAB ───────────────────────────────────────────────────────────── */}
      {tab === "mcq" && (
        <div className="space-y-4">
          {/* Add form toggle */}
          {!addMcqOpen ? (
            <Link href="/admin/questions?tab=mcq&addMcq=1"
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-medium text-[#475569] transition hover:border-amber-400 hover:text-amber-600">
              <Plus size={16} /> Add New MCQ Question
            </Link>
          ) : (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Add New MCQ Question</p>
                  <p className="text-[11px] text-[#64748B]">Four options, one correct answer, plus a short explanation shown after scoring.</p>
                </div>
                <Link href="/admin/questions?tab=mcq" className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={createMcqQuestion} className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Question *</label>
                  <input name="questionText" required placeholder="e.g. Which HTTP status code indicates a successful request?" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute *</label>
                  <select name="attributeId" required defaultValue="" className={inputCls}>
                    <option value="" disabled>Select attribute…</option>
                    {attributes.map((a) => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                </div>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n}>
                    <label className="mb-1 block text-xs font-medium text-[#475569]">Option {n} *</label>
                    <input name={`option${n}`} required placeholder={`Option ${n}`} className={inputCls} />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Correct option *</label>
                  <select name="correctOption" required defaultValue="" className={inputCls}>
                    <option value="" disabled>Select correct option…</option>
                    <option value="1">Option 1</option>
                    <option value="2">Option 2</option>
                    <option value="3">Option 3</option>
                    <option value="4">Option 4</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Explanation *</label>
                  <input name="explanation" required placeholder="Shown to candidates/admins after scoring to explain the correct answer." className={inputCls} />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href="/admin/questions?tab=mcq" className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Question list */}
          <div className={card}>
            <div className={cardHeader}>
              <p className="text-sm font-semibold text-[#0F172A]">MCQ Questions</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Four-option multiple choice, used for knowledge/technical-skills assessments. Attach these to an assessment from its builder page.</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {mcqQuestions.map((q, idx) => {
                const options = [q.option1, q.option2, q.option3, q.option4];
                return (
                  <div key={q.id} className="px-5 py-4 sm:flex sm:items-start sm:gap-4">
                    <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] leading-snug">{q.questionText}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {q.attribute && (
                          <span className="rounded-full border border-[#D1FAE5] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                            [{q.attribute.code}] {q.attribute.name}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {options.map((opt, oi) => (
                          <p key={oi} className={`flex items-start gap-1.5 text-xs ${oi + 1 === q.correctOption ? "font-semibold text-emerald-700" : "text-[#475569]"}`}>
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${oi + 1 === q.correctOption ? "bg-emerald-100 text-emerald-700" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </p>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-[11px] italic text-[#94A3B8]">{q.explanation}</p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                      <form key={q.attributeId ?? "none"} action={updateMcqAttribute} className="flex flex-1 items-center gap-2">
                        <input type="hidden" name="questionId" value={q.id} />
                        <select name="attributeId" defaultValue={q.attributeId ?? ""} className={selectCls}>{attrOptions}</select>
                        <button type="submit" className={saveBtnCls}>Save</button>
                      </form>
                      <form action={deleteMcqQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition shrink-0" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
              {mcqQuestions.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-[#64748B]">No MCQ questions yet. Add one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SJT TAB ───────────────────────────────────────────────────────────── */}
      {tab === "sjt" && (
        <div className="space-y-4">
          {!addSjtOpen ? (
            <Link href="/admin/questions?tab=sjt&addSjt=1"
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-medium text-[#475569] transition hover:border-blue-400 hover:text-blue-600">
              <Plus size={16} /> Add New SJT Item
            </Link>
          ) : (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Add New Situational Judgment Item</p>
                  <p className="text-[11px] text-[#64748B]">A short scenario with response options — each option carries its own point value, so credit isn&apos;t all-or-nothing.</p>
                </div>
                <Link href="/admin/questions?tab=sjt" className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <form action={createSjtQuestion} className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Scenario *</label>
                  <input name="prompt" required placeholder="e.g. A teammate consistently misses deadlines. What do you do?" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#475569]">Attribute *</label>
                  <select name="attributeId" required defaultValue="" className={inputCls}>
                    <option value="" disabled>Select attribute…</option>
                    {attributes.map((a) => (
                      <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>
                    ))}
                  </select>
                </div>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="rounded-xl border border-[#E2E8F0] p-3">
                    <label className="mb-1 block text-xs font-medium text-[#475569]">Response {n} *</label>
                    <input name={`opt${n}_label`} required placeholder={`Response ${n}`} className={`${inputCls} mb-2`} />
                    <label className="mb-1 block text-xs font-medium text-[#475569]">Points *</label>
                    <input name={`opt${n}_score`} type="number" step="1" required placeholder="e.g. 3 = best, 0 = worst" className={inputCls} />
                  </div>
                ))}
                <div className="sm:col-span-2 flex justify-end gap-3 border-t border-[#F1F5F9] pt-4">
                  <Link href="/admin/questions?tab=sjt" className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Cancel</Link>
                  <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Add SJT Item
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={card}>
            <div className={cardHeader}>
              <p className="text-sm font-semibold text-[#0F172A]">Situational Judgment Items</p>
              <p className="mt-0.5 text-xs text-[#64748B]">Scenario-based questions scored with weighted partial credit across options.</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {sjtItems.map((item, idx) => {
                const bestScore = Math.max(...item.options.map((o) => o.scoreValue ?? 0));
                return (
                  <div key={item.id} className="px-5 py-4 sm:flex sm:items-start sm:gap-4">
                    <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A] leading-snug">{item.prompt}</p>
                      {item.trait && <p className="mt-1 text-[10px] text-[#94A3B8]">Attribute: {item.trait}</p>}
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {item.options.map((opt) => (
                          <p key={opt.id} className={`flex items-start gap-1.5 text-xs ${opt.scoreValue === bestScore ? "font-semibold text-emerald-700" : "text-[#475569]"}`}>
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${opt.scoreValue === bestScore ? "bg-emerald-100 text-emerald-700" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                              {opt.scoreValue ?? 0}pt
                            </span>
                            {opt.label}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                      <form key={item.attributeId ?? "none"} action={updateItemAttribute} className="flex flex-1 items-center gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="tab" value="sjt" />
                        <select name="attributeId" defaultValue={item.attributeId ?? ""} className={selectCls}>{attrOptions}</select>
                        <button type="submit" className={saveBtnCls}>Save</button>
                      </form>
                      <form action={deleteSjtItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
              {sjtItems.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-[#64748B]">No SJT items yet. Add one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CASE STUDY TAB ────────────────────────────────────────────────────── */}
      {tab === "case_study" && (
        <div className="space-y-4">
          {!addCaseStudyOpen ? (
            <Link href="/admin/questions?tab=case_study&addCaseStudy=1"
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white px-5 py-3.5 text-sm font-medium text-[#475569] transition hover:border-fuchsia-400 hover:text-fuchsia-600">
              <Plus size={16} /> Add New Case Study
            </Link>
          ) : (
            <div className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Add New Case Study</p>
                  <p className="text-[11px] text-[#64748B]">One passage with as many multiple-choice sub-questions as you add, shown together on one screen.</p>
                </div>
                <Link href="/admin/questions?tab=case_study" className="text-xs text-[#94A3B8] hover:text-[#334155]">Cancel</Link>
              </div>
              <CaseStudyForm attributes={attributes} action={createCaseStudy} />
            </div>
          )}

          {caseStudies.map((cs, gi) => (
            <div key={cs.id} className={card}>
              <div className={`${cardHeader} flex items-center justify-between`}>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Case Study {gi + 1}: {cs.title}</p>
                  <p className="text-[11px] text-[#94A3B8]">Section: {cs.section?.title ?? "—"} · {cs.subQuestions.length} sub-questions</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-[11px] font-semibold text-fuchsia-700">Case Study</span>
                  <form action={deleteCaseStudy}>
                    <input type="hidden" name="id" value={cs.id} />
                    <button type="submit" className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Delete case study">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
              <div className="whitespace-pre-line border-b border-[#F1F5F9] bg-[#FAFAFA] px-5 py-3 text-xs leading-relaxed text-[#475569]">
                {cs.passageText}
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {cs.subQuestions.map((sq, si) => (
                  <div key={sq.id} className="px-5 py-3.5 sm:flex sm:items-start sm:gap-4">
                    <span className="hidden sm:flex h-6 w-6 shrink-0 mt-0.5 items-center justify-center rounded-lg bg-fuchsia-50 text-[11px] font-bold text-fuchsia-600">{si + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#0F172A] leading-snug">{sq.prompt}</p>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {sq.options.map((opt, oi) => (
                          <p key={opt.id} className={`flex items-start gap-1.5 text-xs ${opt.isCorrect ? "font-semibold text-emerald-700" : "text-[#475569]"}`}>
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${opt.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-[#F1F5F9] text-[#94A3B8]"}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt.label}
                          </p>
                        ))}
                      </div>
                      {sq.trait && <p className="mt-1.5 text-[10px] text-[#94A3B8]">Attribute: {sq.trait}</p>}
                    </div>
                    <form key={sq.attributeId ?? "none"} action={updateItemAttribute} className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:w-56">
                      <input type="hidden" name="itemId" value={sq.id} />
                      <input type="hidden" name="tab" value="case_study" />
                      <select name="attributeId" defaultValue={sq.attributeId ?? ""} className={selectCls}>{attrOptions}</select>
                      <button type="submit" className={saveBtnCls}>Save</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {caseStudies.length === 0 && (
            <div className={`${card} px-5 py-10 text-center text-sm text-[#64748B]`}>No case studies yet. Add one above.</div>
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
                      <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">{compMaps.length} attributes</span>
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] text-[#475569]">Formula: {comp.scoringFormula.replace("_", " ")}</span>
                      <Link href="/admin/competencies?tab=competencies" className="text-[11px] text-[#0F766E] hover:underline">Edit formula →</Link>
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
                          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-[#2563EB]">{total} questions</span>
                        </div>
                        {total > 0 && (
                          <div className="mt-2 ml-8 space-y-1">
                            {[...attrLikert.slice(0, 2).map((i) => ({ text: i.prompt, type: "L" })), ...attrStmts.slice(0, 2).map((s) => ({ text: s.statementText, type: "T" }))].map((item, ii) => (
                              <p key={ii} className="flex items-start gap-1.5 text-xs text-[#64748B]">
                                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${item.type === "L" ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-purple-50 text-purple-600"}`}>{item.type}</span>
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
              <Link href="/admin/competencies" className="mt-3 inline-block text-sm font-medium text-[#0F766E] hover:underline">Set up competencies →</Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
