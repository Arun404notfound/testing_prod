import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentTenantSelect } from "@/components/admin/assessment-tenant-select";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentType } from "@/generated/prisma/enums";
import {
  allowsLikertPool,
  allowsTriadPool,
} from "@/lib/assessment-pools";
import {
  removeCompositionItem,
  removeMcqQuestion,
  saveAssessmentDetails,
  setLifecycleStatus,
  updateAssessmentBrandingTenant,
  updateAssessmentReportTemplate,
} from "./actions";
import { REPORT_TEMPLATE_LABELS, REPORT_TEMPLATE_TYPES } from "@/lib/report-layout";
import { BulkLikertPool } from "./bulk-likert-pool";
import { BulkTriadPool } from "./bulk-triad-pool";
import { BuilderHeaderActions } from "./builder-header-actions";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";
import { ScrollToId } from "@/components/ui/scroll-to-id";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Search = {
  tab?: string;
  sentiment?: string;
  attribute?: string;
  groupCode?: string;
  saved?: string;
};

type PoolTab = "likert" | "triad";

function allowedTabsForType(assessmentType: AssessmentType): PoolTab[] {
  const tabs: PoolTab[] = [];
  if (allowsLikertPool(assessmentType)) tabs.push("likert");
  if (allowsTriadPool(assessmentType)) tabs.push("triad");
  return tabs;
}

function resolveTab(assessmentType: AssessmentType, tab: string | undefined): PoolTab {
  const allowed = allowedTabsForType(assessmentType);
  if (tab === "likert" || tab === "triad") {
    if (allowed.includes(tab)) return tab;
  }
  return allowed[0] ?? "likert";
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
  const boundSaveDetails = saveAssessmentDetails.bind(null, assessment.id);

  const assessmentType = assessment.assessmentType;
  const tab = resolveTab(assessmentType, sp.tab);
  const sentimentQ = sp.sentiment === "POSITIVE" || sp.sentiment === "NEGATIVE" ? sp.sentiment : "";
  const attributeQ = sp.attribute?.trim() || "";
  const groupCodeQ = sp.groupCode?.trim() || "";

  const hybridTabHref = (nextTab: PoolTab) => {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (sentimentQ) params.set("sentiment", sentimentQ);
    if (attributeQ) params.set("attribute", attributeQ);
    if (groupCodeQ) params.set("groupCode", groupCodeQ);
    const qs = params.toString();
    return `/admin/assessments/${assessmentId}/builder${qs ? `?${qs}` : ""}`;
  };

  // Find all assessments that belong to this tenant (for pool browsing).
  // We query items directly — no special pool-assessment-name required.
  const tenantAssessmentIds = (
    await prisma.assessment.findMany({
      where: { tenantId },
      select: { id: true },
    })
  ).map((a) => a.id);

  const [likertItems, triadGroups] = await Promise.all([
    allowsLikertPool(assessmentType)
      ? prisma.assessmentItem.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            itemType: "LIKERT",
            ...(attributeQ ? { trait: attributeQ } : {}),
            ...(sentimentQ ? { polarity: sentimentQ } : {}),
          },
          include: { section: true },
          orderBy: { displayOrder: "asc" },
          take: 500,
        })
      : Promise.resolve([]),
    allowsTriadPool(assessmentType)
      ? prisma.triadGroup.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            ...(groupCodeQ
              ? {
                  OR: [
                    { triadGroupCode: { contains: groupCodeQ } },
                    { title: { contains: groupCodeQ } },
                  ],
                }
              : {}),
            ...(attributeQ || sentimentQ
              ? {
                  statements: {
                    some: {
                      ...(attributeQ ? { trait: attributeQ } : {}),
                      ...(sentimentQ ? { polarity: sentimentQ } : {}),
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

  const attributeNames = [...new Set(allAttributes.map((a) => a.name))].sort((a, b) => a.localeCompare(b));

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
        section: c.sourceItem.section?.title ?? "Question Pool",
        key: `comp-${c.id}`,
        label: c.sourceItem.prompt,
      });
    } else if (c.sourceTriad) {
      const code = c.sourceTriad.triadGroupCode ?? c.sourceTriad.title;
      const stmts = c.sourceTriad.statements.map((s) => s.statementText).join(" · ");
      selectedRows.push({
        kind: "triad",
        section: c.sourceTriad.section?.title ?? "Question Pool",
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
      {sp.saved === "details" && (
        <AutoDismissToast message="Assessment details saved successfully." durationMs={3000} />
      )}
      <ScrollToId targetId={sp.tab ? "question-pool" : null} />
      <div>
        <Link href="/admin/assessments" className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#334155] transition mb-3">
          ← Back to assessments
        </Link>
        <PageHeader
          title={assessment.title}
          subtitle={`Builder · ${assessmentType} · ${assessment.lifecycleStatus}`}
          right={
            <div className="flex flex-wrap items-center gap-3">
              <BuilderHeaderActions assessmentId={assessment.id} assessmentTitle={assessment.title} />
            </div>
          }
        />
      </div>

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
                  ? "border-[#2563EB] bg-teal-50 text-[#2563EB]"
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

      <FormCard title="Edit details">
        <p className="mb-4 text-sm text-[#64748B]">
          Update the assessment title, description, and duration. Changes are saved immediately.
        </p>
        <form action={boundSaveDetails} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Title</span>
              <input
                name="title"
                required
                defaultValue={assessment.title}
                className="tg-input w-full"
                placeholder="Assessment title"
              />
            </label>
            <label className="text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Duration (minutes)</span>
              <input
                name="durationMinutes"
                type="number"
                min={1}
                defaultValue={assessment.durationMinutes ?? ""}
                className="tg-input w-full"
              />
            </label>
          </div>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Description</span>
            <textarea
              name="description"
              rows={2}
              defaultValue={assessment.description ?? ""}
              className="tg-input w-full"
            />
          </label>
          <button type="submit" className="tg-button-primary w-fit text-sm">
            Save details
          </button>
        </form>
      </FormCard>

      <FormCard title="Tenant & branding">
        <p className="mb-4 text-sm text-[#64748B]">
          Sets which client logo and colors appear on reports and the candidate test screen. Pool browsers still
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
        <form method="GET" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Item type tab</span>
            <select name="tab" defaultValue={tab} className="tg-input w-full">
              {allowsLikertPool(assessmentType) ? <option value="likert">Likert pool</option> : null}
              {allowsTriadPool(assessmentType) ? <option value="triad">Triad pool</option> : null}
            </select>
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Sentiment</span>
            <select name="sentiment" defaultValue={sentimentQ} className="tg-input w-full">
              <option value="">All</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEGATIVE">Negative</option>
            </select>
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Attribute (trait)</span>
            <SearchableSelect
              name="attribute"
              options={attributeNames}
              defaultValue={attributeQ}
              placeholder="Type to search…"
              allLabel="All attributes"
            />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Triad group code</span>
            <input name="groupCode" defaultValue={groupCodeQ} className="tg-input w-full" placeholder="Triad tab" />
          </label>
          <div className="md:col-span-2 lg:col-span-4">
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
            {Array.from(bySection.entries()).map(([sectionName, rows]) => {
              const visibleRows = rows.slice(0, 3);
              const restRows = rows.slice(3);
              const renderRow = (row: SelectedRow) => (
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
              );
              return (
                <div key={sectionName}>
                  <h3 className="mb-2 text-sm font-semibold text-[#0F172A]">
                    {sectionName} <span className="font-normal text-slate-400">({rows.length})</span>
                  </h3>
                  <ul className="space-y-2 text-sm text-[#334155]">
                    {visibleRows.map((row) => renderRow(row))}
                  </ul>
                  {restRows.length > 0 && (
                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-[#2563EB] hover:underline">
                        View all ({restRows.length} more) →
                      </summary>
                      <ul className="mt-2 space-y-2 text-sm text-[#334155]">
                        {restRows.map((row) => renderRow(row))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FormCard>


      {tab === "likert" && allowsLikertPool(assessmentType) ? (
        <FormCard id="question-pool" title={`Likert question pool (${likertItems.length})`}>
          <BulkLikertPool
            assessmentId={assessment.id}
            items={likertItems}
            selectedIdList={[...selectedLikertIds]}
            compositionIdMap={[...compositionIdByLikertItemId]}
            attrByNameEntries={[...attrByName]}
          />
        </FormCard>
      ) : null}

      {tab === "triad" && allowsTriadPool(assessmentType) ? (
        <FormCard id="question-pool" title={`Triad question pool (${triadGroups.length})`}>
          <BulkTriadPool
            assessmentId={assessment.id}
            groups={triadGroups}
            selectedIdList={[...selectedTriadIds]}
            compositionIdMap={[...compositionIdByTriadGroupId]}
            attrByNameEntries={[...attrByName]}
          />
        </FormCard>
      ) : null}

      {assessmentType === "HYBRID" ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("likert")}>
            Likert tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("triad")}>
            Triad tab
          </Link>
        </div>
      ) : null}
    </main>
  );
}
