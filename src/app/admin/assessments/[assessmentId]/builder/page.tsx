import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { AssessmentTenantSelect } from "@/components/admin/assessment-tenant-select";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentType } from "@/generated/prisma/enums";
import {
  allowsLikertPool,
  allowsMcqPool,
  allowsTriadPool,
} from "@/lib/assessment-pools";
import {
  addLikertFromPool,
  addMcqQuestion,
  addTriadFromPool,
  removeCompositionItem,
  removeMcqQuestion,
  setLifecycleStatus,
  updateAssessmentBrandingTenant,
  updateAssessmentReportTemplate,
} from "./actions";
import { REPORT_TEMPLATE_LABELS, REPORT_TEMPLATE_TYPES } from "@/lib/report-layout";

type Search = {
  tab?: string;
  section?: string;
  category?: string;
  factor?: string;
  attribute?: string;
  groupCode?: string;
};

type PoolTab = "mcq" | "likert" | "triad";

function allowedTabsForType(assessmentType: AssessmentType): PoolTab[] {
  const tabs: PoolTab[] = [];
  if (allowsMcqPool(assessmentType)) tabs.push("mcq");
  if (allowsLikertPool(assessmentType)) tabs.push("likert");
  if (allowsTriadPool(assessmentType)) tabs.push("triad");
  return tabs;
}

function resolveTab(assessmentType: AssessmentType, tab: string | undefined): PoolTab {
  const allowed = allowedTabsForType(assessmentType);
  if (tab === "mcq" || tab === "likert" || tab === "triad") {
    if (allowed.includes(tab)) return tab;
  }
  return allowed[0] ?? "mcq";
}

function buildMcqWhere(tenantId: string, sp: Search): Prisma.QuestionWhereInput {
  const sectionQ = sp.section?.trim() || "";
  const categoryQ = sp.category?.trim() || "";
  const factorQ = sp.factor?.trim() || "";
  const attributeQ = sp.attribute?.trim() || "";

  const andParts: Prisma.QuestionWhereInput[] = [{ tenantId }];

  if (sectionQ) {
    andParts.push({ section: { contains: sectionQ } });
  }
  if (categoryQ) {
    andParts.push({ category: { contains: categoryQ } });
  }
  if (factorQ) {
    andParts.push({
      OR: [{ category: { contains: factorQ } }, { questionText: { contains: factorQ } }],
    });
  }
  if (attributeQ) {
    andParts.push({
      OR: [{ category: { contains: attributeQ } }, { questionText: { contains: attributeQ } }],
    });
  }

  return andParts.length === 1 ? andParts[0]! : { AND: andParts };
}

export default async function AssessmentBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<Search>;
}) {
  const { assessmentId } = await params;
  const sp = await searchParams;
  const tenantId = await getDefaultTenantId();

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId },
    include: {
      tenant: { select: { id: true, name: true, logoUrl: true } },
      sections: { orderBy: { displayOrder: "asc" } },
      questions: { include: { question: true } },
      compositionItems: {
        orderBy: { displayOrder: "asc" },
        include: {
          sourceItem: { include: { section: true } },
          sourceTriad: { include: { section: true, statements: { orderBy: { displayOrder: "asc" } } } },
        },
      },
    },
  });

  if (!assessment) notFound();

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, logoUrl: true },
  });
  const boundUpdateBrandingTenant = updateAssessmentBrandingTenant.bind(null, assessment.id);
  const boundUpdateReportTemplate = updateAssessmentReportTemplate.bind(null, assessment.id);

  const assessmentType = assessment.assessmentType;
  const tab = resolveTab(assessmentType, sp.tab);
  const sectionQ = sp.section?.trim() || "";
  const categoryQ = sp.category?.trim() || "";
  const factorQ = sp.factor?.trim() || "";
  const attributeQ = sp.attribute?.trim() || "";
  const groupCodeQ = sp.groupCode?.trim() || "";

  const hybridTabHref = (nextTab: PoolTab) => {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (sectionQ) params.set("section", sectionQ);
    if (categoryQ) params.set("category", categoryQ);
    if (factorQ) params.set("factor", factorQ);
    if (attributeQ) params.set("attribute", attributeQ);
    if (groupCodeQ) params.set("groupCode", groupCodeQ);
    const qs = params.toString();
    return `/admin/assessments/${assessmentId}/builder${qs ? `?${qs}` : ""}`;
  };

  const selectedMcqIds = new Set(assessment.questions.map((q) => q.questionId));

  const mcqWhere = buildMcqWhere(tenantId, sp);

  // Find all assessments that belong to this tenant (for pool browsing).
  // We query items directly — no special pool-assessment-name required.
  const tenantAssessmentIds = (
    await prisma.assessment.findMany({
      where: { tenantId },
      select: { id: true },
    })
  ).map((a) => a.id);

  const [mcqPool, likertItems, triadGroups] = await Promise.all([
    allowsMcqPool(assessmentType)
      ? prisma.question.findMany({
          where: mcqWhere,
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    allowsLikertPool(assessmentType)
      ? prisma.assessmentItem.findMany({
          where: {
            assessmentId: { in: tenantAssessmentIds },
            itemType: "LIKERT",
            ...(sectionQ ? { section: { title: { contains: sectionQ } } } : {}),
            ...(factorQ ? { factor: { contains: factorQ } } : {}),
            ...(attributeQ ? { trait: { contains: attributeQ } } : {}),
          },
          include: { section: true },
          orderBy: { displayOrder: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
    allowsTriadPool(assessmentType)
      ? prisma.triadGroup.findMany({
          where: {
            assessmentId: { in: tenantAssessmentIds },
            ...(sectionQ ? { section: { title: { contains: sectionQ } } } : {}),
            ...(groupCodeQ
              ? {
                  OR: [
                    { triadGroupCode: { contains: groupCodeQ } },
                    { title: { contains: groupCodeQ } },
                  ],
                }
              : {}),
            ...(factorQ || attributeQ
              ? {
                  statements: {
                    some: {
                      ...(factorQ ? { factor: { contains: factorQ } } : {}),
                      ...(attributeQ ? { trait: { contains: attributeQ } } : {}),
                    },
                  },
                }
              : {}),
          },
          include: {
            section: true,
            statements: { orderBy: { displayOrder: "asc" } },
          },
          orderBy: { displayOrder: "asc" },
          take: 80,
        })
      : Promise.resolve([]),
  ]);

  // ── Attribute → Competency lookup ───────────────────────────────────────────
  // Used to show attribute code + competency badges on every pool question.
  const allAttributes = await prisma.attribute.findMany({
    where: { tenantId },
    include: {
      competencyMaps: { include: { competency: { select: { id: true, name: true } } } },
    },
  });

  /** Map: lower-cased attribute name → { code, category, competencies[] } */
  type AttrInfo = { code: string; category: string | null; competencies: string[] };
  const attrByName = new Map<string, AttrInfo>();
  for (const a of allAttributes) {
    attrByName.set(a.name.toLowerCase(), {
      code: a.code,
      category: a.category,
      competencies: a.competencyMaps.map((m) => m.competency.name),
    });
  }

  const selectedLikertIds = new Set(
    assessment.compositionItems
      .map((c) => c.sourceAssessmentItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedTriadIds = new Set(
    assessment.compositionItems
      .map((c) => c.sourceTriadGroupId)
      .filter((id): id is string => Boolean(id)),
  );
  const compositionIdByLikertItemId = new Map(
    assessment.compositionItems
      .filter((c) => c.sourceAssessmentItemId)
      .map((c) => [c.sourceAssessmentItemId!, c.id]),
  );
  const compositionIdByTriadGroupId = new Map(
    assessment.compositionItems
      .filter((c) => c.sourceTriadGroupId)
      .map((c) => [c.sourceTriadGroupId!, c.id]),
  );

  type SelectedRow =
    | { kind: "mcq"; section: string; key: string; label: string }
    | { kind: "likert"; section: string; key: string; label: string }
    | { kind: "triad"; section: string; key: string; label: string };

  const selectedRows: SelectedRow[] = [];
  for (const aq of assessment.questions) {
    selectedRows.push({
      kind: "mcq",
      section: aq.question.section,
      key: `mcq-${aq.question.id}`,
      label: aq.question.questionText,
    });
  }
  for (const c of assessment.compositionItems) {
    if (c.sourceItem) {
      selectedRows.push({
        kind: "likert",
        section: c.sourceItem.section.title,
        key: `comp-${c.id}`,
        label: c.sourceItem.prompt,
      });
    } else if (c.sourceTriad) {
      const code = c.sourceTriad.triadGroupCode ?? c.sourceTriad.title;
      const stmts = c.sourceTriad.statements.map((s) => s.statementText).join(" · ");
      selectedRows.push({
        kind: "triad",
        section: c.sourceTriad.section.title,
        key: `comp-${c.id}`,
        label: `${code}: ${stmts}`,
      });
    }
  }

  const bySection = new Map<string, SelectedRow[]>();
  for (const row of selectedRows) {
    const list = bySection.get(row.section) ?? [];
    list.push(row);
    bySection.set(row.section, list);
  }

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title={assessment.title}
        subtitle={`Builder · ${assessmentType} · ${assessment.lifecycleStatus}`}
        right={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/assessments" className="text-sm font-medium text-[#1D4ED8] hover:underline">
              All assessments
            </Link>
          </div>
        }
      />

      <FormCard title="Publish status">
        <p className="mb-3 text-sm text-[#64748B]">
          Only published assessments can be assigned to candidates.
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={setLifecycleStatus.bind(null, assessment.id, "draft")}>
            <button
              type="submit"
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                assessment.lifecycleStatus === "draft"
                  ? "border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Draft
            </button>
          </form>
          <form action={setLifecycleStatus.bind(null, assessment.id, "published")}>
            <button
              type="submit"
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                assessment.lifecycleStatus === "published"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Published
            </button>
          </form>
        </div>
      </FormCard>

      <FormCard title="Tenant & branding">
        <p className="mb-4 text-sm text-[#64748B]">
          Sets which client logo and colors appear on reports and the candidate test screen. MCQ and pool browsers still
          use the demo workspace question bank.
        </p>
        <form action={boundUpdateBrandingTenant} className="space-y-4">
          <AssessmentTenantSelect tenants={tenants} initialTenantId={assessment.tenantId} />
          <button type="submit" className="tg-button-primary text-sm">
            Save tenant
          </button>
        </form>
      </FormCard>

      <FormCard title="Report template">
        <p className="mb-4 text-sm text-[#64748B]">
          Controls which PDF layout is used for this assessment&apos;s results. Pick the template that matches the
          assessment type (for example forced-choice assessments use the forced-choice report template). “Custom” picks
          the layout from the assessment type.
        </p>
        <form action={boundUpdateReportTemplate} className="flex flex-wrap items-end gap-4">
          <label className="min-w-[240px] flex-1 text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Template</span>
            <select
              name="reportTemplateType"
              defaultValue={assessment.reportTemplateType}
              className="tg-input w-full"
            >
              {REPORT_TEMPLATE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_TEMPLATE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="tg-button-primary text-sm">
            Save template
          </button>
        </form>
      </FormCard>

      <FormCard title="Filters (pool browser)">
        <form method="GET" className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Item type tab</span>
            <select name="tab" defaultValue={tab} className="tg-input w-full">
              {allowsMcqPool(assessmentType) ? <option value="mcq">MCQ pool</option> : null}
              {allowsLikertPool(assessmentType) ? <option value="likert">Likert pool</option> : null}
              {allowsTriadPool(assessmentType) ? <option value="triad">Triad pool</option> : null}
            </select>
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Section</span>
            <input name="section" defaultValue={sectionQ} className="tg-input w-full" placeholder="Contains…" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Category (MCQ)</span>
            <input name="category" defaultValue={categoryQ} className="tg-input w-full" placeholder="Contains…" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Factor</span>
            <input name="factor" defaultValue={factorQ} className="tg-input w-full" placeholder="Likert / triad" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Attribute (trait)</span>
            <input name="attribute" defaultValue={attributeQ} className="tg-input w-full" placeholder="Contains…" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Triad group code</span>
            <input name="groupCode" defaultValue={groupCodeQ} className="tg-input w-full" placeholder="Triad tab" />
          </label>
          <div className="md:col-span-3 lg:col-span-6">
            <button type="submit" className="tg-button-primary text-sm">
              Apply filters
            </button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Selected content (by section)">
        {selectedRows.length === 0 ? (
          <p className="text-sm text-slate-500">No items yet. Add from the pool below.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(bySection.entries()).map(([sectionName, rows]) => (
              <div key={sectionName}>
                <h3 className="mb-2 text-sm font-semibold text-[#0F172A]">{sectionName}</h3>
                <ul className="space-y-2 text-sm text-[#334155]">
                  {rows.map((row) => (
                    <li
                      key={row.key}
                      className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 md:flex-row md:items-start md:justify-between"
                    >
                      <div>
                        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-600">
                          {row.kind}
                        </span>
                        <span>{row.label}</span>
                      </div>
                      <div className="shrink-0">
                        {row.kind === "mcq" ? (
                          <form action={removeMcqQuestion.bind(null, assessment.id, row.key.replace("mcq-", ""))}>
                            <button type="submit" className="text-sm font-medium text-rose-600 hover:underline">
                              Remove
                            </button>
                          </form>
                        ) : (
                          <form
                            action={removeCompositionItem.bind(
                              null,
                              assessment.id,
                              row.key.replace("comp-", ""),
                            )}
                          >
                            <button type="submit" className="text-sm font-medium text-rose-600 hover:underline">
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </FormCard>

      {tab === "mcq" && allowsMcqPool(assessmentType) ? (
        <FormCard title="MCQ question pool">
          <p className="mb-3 text-sm text-[#64748B]">Tenant question bank. MCQ demo flow uses linked questions only.</p>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {mcqPool.map((q) => (
              <li key={q.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    {q.section} · {q.category}
                  </p>
                  <p className="text-sm text-[#0F172A]">{q.questionText}</p>
                </div>
                {selectedMcqIds.has(q.id) ? (
                  <form action={removeMcqQuestion.bind(null, assessment.id, q.id)}>
                    <button type="submit" className="text-sm font-medium text-rose-600 hover:underline">
                      Remove
                    </button>
                  </form>
                ) : (
                  <form action={addMcqQuestion.bind(null, assessment.id, q.id)}>
                    <button type="submit" className="text-sm font-medium text-[#1D4ED8] hover:underline">
                      Add
                    </button>
                  </form>
                )}
              </li>
            ))}
            {mcqPool.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">No questions match filters.</li>
            ) : null}
          </ul>
        </FormCard>
      ) : null}

      {tab === "likert" && allowsLikertPool(assessmentType) ? (
        <FormCard title={`Likert question pool (${likertItems.length})`}>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {likertItems.map((item) => {
              const attrInfo = item.trait ? attrByName.get(item.trait.toLowerCase()) : undefined;
              const isSelected = selectedLikertIds.has(item.id);
              return (
                <li key={item.id} className={`flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between ${isSelected ? "bg-emerald-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    {/* Big Five factor · polarity */}
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {item.factor}{item.polarity ? ` · ${item.polarity}` : ""}
                    </p>
                    {/* Question text */}
                    <p className="text-sm text-[#0F172A]">{item.prompt}</p>
                    {/* Attribute + Competency badges */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {attrInfo ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                            [{attrInfo.code}] {item.trait}
                          </span>
                          {attrInfo.competencies.map((c) => (
                            <span key={c} className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                              {c}
                            </span>
                          ))}
                        </>
                      ) : item.trait ? (
                        <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                          {item.trait} <span className="ml-1 opacity-60">(no mapping)</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {isSelected ? (
                      <form action={removeCompositionItem.bind(null, assessment.id, compositionIdByLikertItemId.get(item.id) ?? "")}>
                        <button type="submit" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100">
                          ✓ Added · Remove
                        </button>
                      </form>
                    ) : (
                      <form action={addLikertFromPool.bind(null, assessment.id, item.id)}>
                        <button type="submit" className="rounded-md border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#1D4ED8] hover:bg-blue-100">
                          + Add
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
            {likertItems.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">No Likert items match filters.</li>
            ) : null}
          </ul>
        </FormCard>
      ) : null}

      {tab === "triad" && allowsTriadPool(assessmentType) ? (
        <FormCard title={`Triad question pool (${triadGroups.length})`}>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {triadGroups.map((g) => {
              const isSelected = selectedTriadIds.has(g.id);

              // Collect unique competencies across all statements in this group
              const groupComps: string[] = [];
              for (const s of g.statements) {
                const info = s.trait ? attrByName.get(s.trait.toLowerCase()) : undefined;
                if (info) {
                  for (const c of info.competencies) {
                    if (!groupComps.includes(c)) groupComps.push(c);
                  }
                }
              }

              return (
                <li key={g.id} className={`flex flex-col gap-3 p-3 md:flex-row md:items-start md:justify-between ${isSelected ? "bg-emerald-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    {/* Section · group code */}
                    <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {g.section.title}{g.triadGroupCode ? ` · ${g.triadGroupCode}` : ""}
                    </p>
                    {/* Group title */}
                    <p className="text-sm font-semibold text-[#0F172A]">{g.title}</p>
                    {/* Competency summary line */}
                    {groupComps.length > 0 && (
                      <div className="mt-1 mb-2 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-medium text-slate-400 mr-0.5">Competencies:</span>
                        {groupComps.map((c) => (
                          <span key={c} className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Each statement with its attribute + competency */}
                    <div className="space-y-2">
                      {g.statements.map((s, si) => {
                        const label = ["A", "B", "C"][si] ?? String(si + 1);
                        const sAttrInfo = s.trait ? attrByName.get(s.trait.toLowerCase()) : undefined;
                        return (
                          <div key={s.id} className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                              {label}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-[#0F172A]">{s.statementText}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {sAttrInfo ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 rounded border border-[#DBEAFE] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">
                                      [{sAttrInfo.code}] {s.trait}
                                    </span>
                                    {sAttrInfo.competencies.map((c) => (
                                      <span key={c} className="inline-flex items-center rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                        {c}
                                      </span>
                                    ))}
                                  </>
                                ) : s.trait ? (
                                  <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                                    {s.trait} <span className="ml-1 opacity-60">(no mapping)</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {isSelected ? (
                      <form action={removeCompositionItem.bind(null, assessment.id, compositionIdByTriadGroupId.get(g.id) ?? "")}>
                        <button type="submit" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100">
                          ✓ Added · Remove
                        </button>
                      </form>
                    ) : (
                      <form action={addTriadFromPool.bind(null, assessment.id, g.id)}>
                        <button type="submit" className="rounded-md border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#1D4ED8] hover:bg-blue-100">
                          + Add
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
            {triadGroups.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">No triad groups match filters.</li>
            ) : null}
          </ul>
        </FormCard>
      ) : null}

      {assessmentType === "HYBRID" ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="text-[#1D4ED8] hover:underline" href={hybridTabHref("mcq")}>
            MCQ tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#1D4ED8] hover:underline" href={hybridTabHref("likert")}>
            Likert tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#1D4ED8] hover:underline" href={hybridTabHref("triad")}>
            Triad tab
          </Link>
        </div>
      ) : null}
    </main>
  );
}
