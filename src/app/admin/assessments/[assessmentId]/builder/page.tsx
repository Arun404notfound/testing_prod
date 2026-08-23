import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { PageHeader } from "@/components/ui/page-header";
import { getDefaultTenantId } from "@/lib/tenant";
import type { AssessmentType, ModuleType } from "@/generated/prisma/enums";
import {
  allowsCaseStudyPool,
  allowsLikertPool,
  allowsMcqPool,
  allowsOpenEndedPool,
  allowsSjtPool,
  allowsSurveyLikertPool,
  allowsTechnicalMcqPool,
  allowsTriadPool,
} from "@/lib/assessment-pools";
import {
  removeCompositionItem,
  removeMcqQuestion,
  saveAssessmentDetails,
  setLifecycleStatus,
  updateAssessmentInstructions,
  updateAssessmentJobRole,
  updateAssessmentSkillFramework,
} from "./actions";
import { BulkLikertPool } from "./bulk-likert-pool";
import { BulkTriadPool } from "./bulk-triad-pool";
import { BulkMcqPool } from "./bulk-mcq-pool";
import { BulkSjtPool } from "./bulk-sjt-pool";
import { BulkCaseStudyPool } from "./bulk-case-study-pool";
import { BulkTechnicalMcqPool } from "./bulk-technical-mcq-pool";
import { BulkOpenEndedPool } from "./bulk-open-ended-pool";
import { BulkSurveyLikertPool } from "./bulk-survey-likert-pool";
import { BuilderHeaderActions } from "./builder-header-actions";
import { CustomInstructionsEditor } from "./custom-instructions-editor";
import { DefaultInstructionsEditor } from "./default-instructions-editor";
import { parseCustomInstructions } from "@/lib/custom-instructions";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";
import { ScrollToId } from "@/components/ui/scroll-to-id";
import { SelectedContentList, type SelectedRow } from "./selected-content-list";
import { PoolFiltersForm } from "./pool-filters-form";

type Search = {
  tab?: string;
  sentiment?: string;
  attribute?: string;
  groupCode?: string;
  saved?: string;
};

type PoolTab = "likert" | "triad" | "mcq" | "sjt" | "case_study" | "technical_mcq" | "open_ended" | "survey_likert";

const ALL_POOL_TABS: PoolTab[] = ["likert", "triad", "mcq", "sjt", "case_study", "technical_mcq", "open_ended", "survey_likert"];

const MODULE_TAB_LABELS: Partial<Record<PoolTab, string>> = {
  technical_mcq: "Technical MCQ tab",
  open_ended: "Open-Ended tab",
  survey_likert: "Survey Likert tab",
};

/**
 * TECHNICAL/SURVEY assessments resolve tabs from the moduleType-keyed pool
 * predicates; PSYCHOMETRIC assessments fall through to the original,
 * untouched legacy AssessmentType-keyed logic — this branch is what keeps
 * the psychometric path byte-identical to before this change.
 */
function allowedTabsForType(assessmentType: AssessmentType, moduleType: ModuleType): PoolTab[] {
  if (moduleType !== "PSYCHOMETRIC") {
    const tabs: PoolTab[] = [];
    if (allowsTechnicalMcqPool(moduleType)) tabs.push("technical_mcq");
    if (allowsOpenEndedPool(moduleType)) tabs.push("open_ended");
    if (allowsSurveyLikertPool(moduleType)) tabs.push("survey_likert");
    return tabs;
  }
  const tabs: PoolTab[] = [];
  if (allowsLikertPool(assessmentType)) tabs.push("likert");
  if (allowsTriadPool(assessmentType)) tabs.push("triad");
  if (allowsMcqPool(assessmentType)) tabs.push("mcq");
  if (allowsSjtPool(assessmentType)) tabs.push("sjt");
  if (allowsCaseStudyPool(assessmentType)) tabs.push("case_study");
  return tabs;
}

function resolveTab(assessmentType: AssessmentType, moduleType: ModuleType, tab: string | undefined): PoolTab {
  const allowed = allowedTabsForType(assessmentType, moduleType);
  if (tab && (ALL_POOL_TABS as string[]).includes(tab) && allowed.includes(tab as PoolTab)) {
    return tab as PoolTab;
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
      sections: { orderBy: { displayOrder: "asc" } },
      questions: { include: { question: true } },
      compositionItems: {
        orderBy: { displayOrder: "asc" },
        include: {
          sourceItem: { include: { section: true } },
          sourceTriad: { include: { section: true, statements: { orderBy: { displayOrder: "asc" } } } },
          sourceCaseStudy: {
            include: { section: true, subQuestions: { orderBy: { displayOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (!assessment) notFound();

  // A module attached to a Program is managed (published, assigned) at the
  // Program level, not individually — this drives the back-link, and hides
  // the standalone Publish/Assign controls further down.
  const programLink = await prisma.programAssessment.findFirst({
    where: { assessmentId: assessment.id },
    select: { programId: true },
  });

  const jobRoles = await prisma.jobRole.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true },
  });
  const skillFrameworks = await prisma.skillFramework.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true },
  });
  const boundUpdateJobRole = updateAssessmentJobRole.bind(null, assessment.id);
  const boundUpdateSkillFramework = updateAssessmentSkillFramework.bind(null, assessment.id);
  const boundSaveDetails = saveAssessmentDetails.bind(null, assessment.id);
  const boundUpdateInstructions = updateAssessmentInstructions.bind(null, assessment.id);
  const parsedInstructions = parseCustomInstructions(assessment.customInstructions);

  const assessmentType = assessment.assessmentType;
  const moduleType = assessment.moduleType;
  const tab = resolveTab(assessmentType, moduleType, sp.tab);
  const moduleTabs = allowedTabsForType(assessmentType, moduleType);
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

  const [likertItems, triadGroups, mcqQuestions, sjtItems, caseStudies, technicalMcqItems, openEndedItems, surveyLikertItems] = await Promise.all([
    allowsLikertPool(assessmentType)
      ? prisma.assessmentItem.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            itemType: "LIKERT",
            // Required so Survey Likert items (skillId set, attributeId null) never
            // leak into the Psychometric pool browser — pooling is tenant-wide, not
            // moduleType-scoped, so this discriminator has to live in the query.
            attributeId: { not: null },
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
    allowsMcqPool(assessmentType)
      ? prisma.question.findMany({
          where: {
            tenantId,
            ...(attributeQ ? { attribute: { name: attributeQ } } : {}),
          },
          include: { attribute: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : Promise.resolve([]),
    allowsSjtPool(assessmentType)
      ? prisma.assessmentItem.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            itemType: "SJT",
            ...(attributeQ ? { trait: attributeQ } : {}),
          },
          include: { section: true, options: { orderBy: { displayOrder: "asc" } } },
          orderBy: { displayOrder: "asc" },
          take: 500,
        })
      : Promise.resolve([]),
    allowsCaseStudyPool(assessmentType)
      ? prisma.caseStudy.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            ...(attributeQ
              ? { subQuestions: { some: { trait: attributeQ } } }
              : {}),
            ...(groupCodeQ ? { title: { contains: groupCodeQ } } : {}),
          },
          include: {
            section: true,
            subQuestions: { orderBy: { displayOrder: "asc" } },
          },
          orderBy: { displayOrder: "asc" },
          take: 200,
        })
      : Promise.resolve([]),
    allowsTechnicalMcqPool(moduleType)
      ? prisma.assessmentItem.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            itemType: { in: ["MCQ_SINGLE", "MCQ_MULTIPLE"] },
            caseStudyId: null,
            attributeId: null,
          },
          include: { options: { orderBy: { displayOrder: "asc" } }, skill: true, subSkill: true },
          orderBy: { displayOrder: "asc" },
          take: 500,
        })
      : Promise.resolve([]),
    allowsOpenEndedPool(moduleType)
      ? prisma.assessmentItem.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            itemType: "OPEN_ENDED",
          },
          include: { skill: true, subSkill: true },
          orderBy: { displayOrder: "asc" },
          take: 500,
        })
      : Promise.resolve([]),
    allowsSurveyLikertPool(moduleType)
      ? prisma.assessmentItem.findMany({
          where: {
            OR: [{ assessmentId: { in: tenantAssessmentIds } }, { assessmentId: null }],
            itemType: "LIKERT",
            // Mirror of the attributeId discriminator above — Survey Likert items
            // are tagged by skillId, never attributeId.
            skillId: { not: null },
          },
          include: { likertScale: true, skill: true, subSkill: true },
          orderBy: { displayOrder: "asc" },
          take: 500,
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

  const selectedMcqIds = new Set(assessment.questions.map((aq) => aq.question.id));
  const selectedLikertIds = new Set(
    assessment.compositionItems
      .filter((c) => c.sourceItem?.itemType === "LIKERT")
      .map((c) => c.sourceAssessmentItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedSjtIds = new Set(
    assessment.compositionItems
      .filter((c) => c.sourceItem?.itemType === "SJT")
      .map((c) => c.sourceAssessmentItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedTechnicalMcqIds = new Set(
    assessment.compositionItems
      .filter((c) => c.sourceItem?.itemType === "MCQ_SINGLE" || c.sourceItem?.itemType === "MCQ_MULTIPLE")
      .map((c) => c.sourceAssessmentItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedOpenEndedIds = new Set(
    assessment.compositionItems
      .filter((c) => c.sourceItem?.itemType === "OPEN_ENDED")
      .map((c) => c.sourceAssessmentItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedSurveyLikertIds = new Set(
    assessment.compositionItems
      .filter((c) => c.sourceItem?.itemType === "LIKERT" && c.sourceItem?.skillId)
      .map((c) => c.sourceAssessmentItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedTriadIds = new Set(
    assessment.compositionItems
      .map((c) => c.sourceTriadGroupId)
      .filter((id): id is string => Boolean(id)),
  );
  const selectedCaseStudyIds = new Set(
    assessment.compositionItems
      .map((c) => c.sourceCaseStudyId)
      .filter((id): id is string => Boolean(id)),
  );
  // Shared by Likert and SJT — both pool through the same sourceAssessmentItemId FK.
  const compositionIdByPooledItemId = new Map(
    assessment.compositionItems
      .filter((c) => c.sourceAssessmentItemId)
      .map((c) => [c.sourceAssessmentItemId!, c.id]),
  );
  const compositionIdByTriadGroupId = new Map(
    assessment.compositionItems
      .filter((c) => c.sourceTriadGroupId)
      .map((c) => [c.sourceTriadGroupId!, c.id]),
  );
  const compositionIdByCaseStudyId = new Map(
    assessment.compositionItems
      .filter((c) => c.sourceCaseStudyId)
      .map((c) => [c.sourceCaseStudyId!, c.id]),
  );

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
        kind: c.sourceItem.itemType === "SJT" ? "sjt" : "likert",
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
    } else if (c.sourceCaseStudy) {
      selectedRows.push({
        kind: "case_study",
        section: c.sourceCaseStudy.section?.title ?? "Question Pool",
        key: `comp-${c.id}`,
        label: `${c.sourceCaseStudy.title} (${c.sourceCaseStudy.subQuestions.length} sub-questions)`,
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
      {sp.saved === "instructions" && (
        <AutoDismissToast message="Instructions saved successfully." durationMs={3000} />
      )}
      <ScrollToId targetId={sp.tab ? "question-pool" : null} />
      <div>
        <Link
          href={programLink ? `/admin/programs/${programLink.programId}/builder` : "/admin/assessments"}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#334155] transition mb-3"
        >
          ← Back to {programLink ? "Program" : "assessments"}
        </Link>
        <PageHeader
          title={assessment.title}
          subtitle={
            programLink
              ? `Builder · ${assessmentType}`
              : `Builder · ${assessmentType} · ${assessment.lifecycleStatus}`
          }
          right={
            <div className="flex flex-wrap items-center gap-3">
              <BuilderHeaderActions
                assessmentId={assessment.id}
                assessmentTitle={assessment.title}
                backToProgramHref={programLink ? `/admin/programs/${programLink.programId}/builder` : null}
              />
            </div>
          }
        />
      </div>

      {!programLink && (
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
      )}

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
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input
                type="checkbox"
                name="randomizeQuestions"
                defaultChecked={assessment.randomizeQuestions}
                className="rounded border-slate-300"
              />
              Randomize question order per candidate
            </label>
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input
                type="checkbox"
                name="randomizeOptions"
                defaultChecked={assessment.randomizeOptions}
                className="rounded border-slate-300"
              />
              Randomize answer option order per candidate
            </label>
          </div>
          <button type="submit" className="tg-button-primary w-fit text-sm">
            Save details
          </button>
        </form>
      </FormCard>

      <FormCard title="Instructions">
        <p className="mb-4 text-sm text-[#64748B]">
          Candidates see the standard instructions below, plus any points you add underneath. Both
          are specific to this assessment — uncheck or drag to reorder any that don&apos;t fit here,
          and a new assessment always starts with all of them checked, in the default order, and no
          extra points.
        </p>
        <form action={boundUpdateInstructions} className="grid gap-5">
          <div>
            <span className="mb-2 block text-sm font-medium text-[#334155]">Standard instructions</span>
            <DefaultInstructionsEditor
              initialOrder={parsedInstructions.defaultOrder}
              initialDisabled={parsedInstructions.disabledDefaults}
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-[#334155]">Additional instructions (optional)</span>
            <CustomInstructionsEditor initial={parsedInstructions.customPoints} />
          </div>

          <button type="submit" className="tg-button-primary w-fit text-sm">
            Save instructions
          </button>
        </form>
      </FormCard>

      {assessment.moduleType === "PSYCHOMETRIC" && (
        <FormCard title="Job role">
          <p className="mb-4 text-sm text-[#64748B]">
            When set, competency scoring and report content come from this Job Role&apos;s Domain →
            Competency → Attribute framework, and its own report template (if configured) takes
            over automatically. When left as None, the report layout is derived automatically
            from the assessment type.
          </p>
          <form key={assessment.jobRoleId ?? "none"} action={boundUpdateJobRole} className="flex flex-wrap items-end gap-4">
            <label className="min-w-[240px] flex-1 text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Job role</span>
              <select
                name="jobRoleId"
                defaultValue={assessment.jobRoleId ?? ""}
                className="tg-input w-full"
              >
                <option value="">None</option>
                {jobRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="tg-button-primary text-sm">
              Save job role
            </button>
          </form>
        </FormCard>
      )}

      {assessment.moduleType === "TECHNICAL" && (
        <FormCard title="Skill framework">
          <p className="mb-4 text-sm text-[#64748B]">
            When set, skill scoring and report content come from this Skill Framework&apos;s Domain →
            Competency → Sub-Skill framework, and its own report template (if configured) takes
            over automatically. When left as None, the report layout is derived automatically
            from the assessment type.
          </p>
          <form key={assessment.skillFrameworkId ?? "none"} action={boundUpdateSkillFramework} className="flex flex-wrap items-end gap-4">
            <label className="min-w-[240px] flex-1 text-sm text-[#334155]">
              <span className="mb-1 block font-medium">Skill framework</span>
              <select
                name="skillFrameworkId"
                defaultValue={assessment.skillFrameworkId ?? ""}
                className="tg-input w-full"
              >
                <option value="">None</option>
                {skillFrameworks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="tg-button-primary text-sm">
              Save skill framework
            </button>
          </form>
        </FormCard>
      )}

      {moduleType === "PSYCHOMETRIC" ? (
        <FormCard title="Filters (pool browser)">
          <PoolFiltersForm
            tab={tab as "likert" | "triad" | "mcq" | "sjt" | "case_study"}
            sentimentQ={sentimentQ}
            attributeQ={attributeQ}
            groupCodeQ={groupCodeQ}
            attributeNames={attributeNames}
            showLikert={allowsLikertPool(assessmentType)}
            showTriad={allowsTriadPool(assessmentType)}
            showMcq={allowsMcqPool(assessmentType)}
            showSjt={allowsSjtPool(assessmentType)}
            showCaseStudy={allowsCaseStudyPool(assessmentType)}
          />
        </FormCard>
      ) : (
        moduleTabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {moduleTabs.map((t, i, arr) => (
              <span key={t} className="flex items-center gap-2">
                <Link
                  className={`hover:underline ${tab === t ? "font-semibold text-[#2563EB]" : "text-[#0F766E]"}`}
                  href={`/admin/assessments/${assessmentId}/builder?tab=${t}`}
                >
                  {MODULE_TAB_LABELS[t]}
                </Link>
                {i < arr.length - 1 && <span className="text-slate-300">|</span>}
              </span>
            ))}
          </div>
        )
      )}

      <FormCard title="Selected content (by section)">
        {selectedRows.length === 0 ? (
          <p className="text-sm text-slate-500">No items yet. Add from the pool below.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(bySection.entries()).map(([sectionName, rows]) => (
              <div key={sectionName}>
                <h3 className="mb-2 text-sm font-semibold text-[#0F172A]">
                  {sectionName} <span className="font-normal text-slate-400">({rows.length})</span>
                </h3>
                <SelectedContentList
                  rows={rows}
                  assessmentId={assessment.id}
                  removeMcqQuestion={removeMcqQuestion}
                  removeCompositionItem={removeCompositionItem}
                />
              </div>
            ))}
          </div>
        )}
      </FormCard>


      {tab === "likert" && allowsLikertPool(assessmentType) ? (
        <FormCard id="question-pool" title={`Likert question pool (${likertItems.length})`}>
          <BulkLikertPool
            assessmentId={assessment.id}
            items={likertItems}
            selectedIdList={[...selectedLikertIds]}
            compositionIdMap={[...compositionIdByPooledItemId]}
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

      {tab === "mcq" && allowsMcqPool(assessmentType) ? (
        <FormCard id="question-pool" title={`MCQ question pool (${mcqQuestions.length})`}>
          <BulkMcqPool
            assessmentId={assessment.id}
            questions={mcqQuestions}
            selectedIdList={[...selectedMcqIds]}
            attrByNameEntries={[...attrByName]}
          />
        </FormCard>
      ) : null}

      {tab === "sjt" && allowsSjtPool(assessmentType) ? (
        <FormCard id="question-pool" title={`SJT question pool (${sjtItems.length})`}>
          <BulkSjtPool
            assessmentId={assessment.id}
            items={sjtItems}
            selectedIdList={[...selectedSjtIds]}
            compositionIdMap={[...compositionIdByPooledItemId]}
            attrByNameEntries={[...attrByName]}
          />
        </FormCard>
      ) : null}

      {tab === "case_study" && allowsCaseStudyPool(assessmentType) ? (
        <FormCard id="question-pool" title={`Case study pool (${caseStudies.length})`}>
          <BulkCaseStudyPool
            assessmentId={assessment.id}
            caseStudies={caseStudies}
            selectedIdList={[...selectedCaseStudyIds]}
            compositionIdMap={[...compositionIdByCaseStudyId]}
            attrByNameEntries={[...attrByName]}
          />
        </FormCard>
      ) : null}

      {tab === "technical_mcq" && allowsTechnicalMcqPool(moduleType) ? (
        <FormCard id="question-pool" title={`Technical MCQ pool (${technicalMcqItems.length})`}>
          <BulkTechnicalMcqPool
            assessmentId={assessment.id}
            items={technicalMcqItems.map((i) => ({
              id: i.id,
              itemType: i.itemType,
              prompt: i.prompt,
              skillName: i.skill?.name ?? null,
              subSkillName: i.subSkill?.name ?? null,
              options: i.options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })),
            }))}
            selectedIdList={[...selectedTechnicalMcqIds]}
            compositionIdMap={[...compositionIdByPooledItemId]}
          />
        </FormCard>
      ) : null}

      {tab === "open_ended" && allowsOpenEndedPool(moduleType) ? (
        <FormCard id="question-pool" title={`Open-ended pool (${openEndedItems.length})`}>
          <BulkOpenEndedPool
            assessmentId={assessment.id}
            items={openEndedItems.map((i) => ({
              id: i.id,
              prompt: i.prompt,
              helpText: i.helpText,
              skillName: i.skill?.name ?? null,
              subSkillName: i.subSkill?.name ?? null,
            }))}
            selectedIdList={[...selectedOpenEndedIds]}
            compositionIdMap={[...compositionIdByPooledItemId]}
          />
        </FormCard>
      ) : null}

      {tab === "survey_likert" && allowsSurveyLikertPool(moduleType) ? (
        <FormCard id="question-pool" title={`Survey Likert pool (${surveyLikertItems.length})`}>
          <BulkSurveyLikertPool
            assessmentId={assessment.id}
            items={surveyLikertItems.map((i) => ({
              id: i.id,
              prompt: i.prompt,
              scaleLabel: i.likertScale ? `${i.likertScale.minValue}–${i.likertScale.maxValue}: ${i.likertScale.minLabel} → ${i.likertScale.maxLabel}` : null,
              skillName: i.skill?.name ?? null,
              subSkillName: i.subSkill?.name ?? null,
            }))}
            selectedIdList={[...selectedSurveyLikertIds]}
            compositionIdMap={[...compositionIdByPooledItemId]}
          />
        </FormCard>
      ) : null}

      {moduleType === "PSYCHOMETRIC" ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("likert")}>
            Likert tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("triad")}>
            Triad tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("mcq")}>
            MCQ tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("sjt")}>
            SJT tab
          </Link>
          <span className="text-slate-300">|</span>
          <Link className="text-[#0F766E] hover:underline" href={hybridTabHref("case_study")}>
            Case Study tab
          </Link>
        </div>
      ) : null}
    </main>
  );
}
