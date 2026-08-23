import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { FormCard } from "@/components/ui/form-card";
import { AutoDismissToast } from "@/components/ui/auto-dismiss-toast";
import {
  updateSkillFrameworkDetails,
  createSkillDomain,
  updateSkillDomain,
  deleteSkillDomain,
  reorderSkillDomain,
  createSkillCompetency,
  updateSkillCompetency,
  deleteSkillCompetency,
  reorderSkillCompetency,
  createSkillCompetencyMap,
  deleteSkillCompetencyMap,
  bulkUpdateSkillWeights,
  updateSkillCompetencyBandContent,
  upsertSkillDevelopmentProject,
  deleteSkillDevelopmentProject,
} from "./actions";
import { SkillFrameworkBuilderHeaderActions } from "./header-actions";
import { MappingSection } from "./mapping-section";
import { ReportSection } from "./report-section";

export type BuilderSearch = {
  tab?: string;
  status?: string;
  openDomain?: string;
  openComp?: string;
  editDomainId?: string;
  editCompId?: string;
  comp?: string;
};

const STATUS_MESSAGES: Record<string, { message: string; variant: "success" | "error" }> = {
  success: { message: "Saved successfully.", variant: "success" },
  error: { message: "Something went wrong. Check your input and try again.", variant: "error" },
};

export default async function SkillFrameworkBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ skillFrameworkId: string }>;
  searchParams: Promise<BuilderSearch>;
}) {
  const { skillFrameworkId } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "content" ? "content" : "mapping";
  const tenantId = await getDefaultTenantId();

  const skillFramework = await prisma.skillFramework.findFirst({ where: { id: skillFrameworkId } });
  if (!skillFramework) notFound();

  const [domains, competencies, subSkills] = await Promise.all([
    prisma.skillDomain.findMany({ where: { skillFrameworkId }, orderBy: { displayOrder: "asc" } }),
    prisma.skillCompetency.findMany({
      where: { skillFrameworkId },
      orderBy: { displayOrder: "asc" },
      include: {
        subSkillMaps: { include: { subSkill: { include: { skill: true } } } },
        bandContents: true,
        developmentProjects: { orderBy: { displayOrder: "asc" } },
      },
    }),
    prisma.subSkill.findMany({ where: { skill: { tenantId } }, include: { skill: true }, orderBy: { name: "asc" } }),
  ]);

  const mappingCount = competencies.reduce((sum, c) => sum + c.subSkillMaps.length, 0);

  const boundUpdateDetails = updateSkillFrameworkDetails.bind(null, skillFrameworkId);

  const toast = sp.status ? STATUS_MESSAGES[sp.status] : null;

  return (
    <main className="tg-page space-y-6">
      <PageHeader
        title={skillFramework.name}
        subtitle={skillFramework.description ?? "Map its Domain → Competency → Sub-Skill framework, then fill in its Report Section content."}
        right={
          <div className="flex items-center gap-3">
            <Link href="/admin/skill-frameworks" className="text-sm font-medium text-[#0F766E] hover:underline">
              Back to list
            </Link>
            <SkillFrameworkBuilderHeaderActions skillFrameworkId={skillFrameworkId} skillFrameworkName={skillFramework.name} />
          </div>
        }
      />

      {toast ? <AutoDismissToast message={toast.message} variant={toast.variant} /> : null}

      <FormCard title="Skill framework details">
        <form action={boundUpdateDetails} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Name *</span>
            <input name="name" required defaultValue={skillFramework.name} className="tg-input" />
          </label>
          <label className="text-sm text-[#334155]">
            <span className="mb-1 block font-medium">Slug <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <input name="slug" defaultValue={skillFramework.slug ?? ""} className="tg-input" />
          </label>
          <label className="text-sm text-[#334155] md:col-span-2">
            <span className="mb-1 block font-medium">Description <span className="font-normal text-[#94A3B8]">(optional)</span></span>
            <textarea name="description" rows={2} defaultValue={skillFramework.description ?? ""} className="tg-input w-full" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#334155]">
            <input type="checkbox" name="isActive" defaultChecked={skillFramework.isActive} className="rounded border-slate-300" />
            Active — selectable when creating Technical assessments
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="tg-button-primary text-sm">Save details</button>
          </div>
        </form>
      </FormCard>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="-mb-px flex flex-wrap gap-6">
          <Link
            href={`/admin/skill-frameworks/${skillFrameworkId}/builder?tab=mapping`}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              tab === "mapping" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"
            }`}
          >
            Mapping ({domains.length} domains · {competencies.length} competencies · {mappingCount} sub-skills)
          </Link>
          <Link
            href={`/admin/skill-frameworks/${skillFrameworkId}/builder?tab=content`}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              tab === "content" ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#64748B] hover:text-[#334155]"
            }`}
          >
            Report Section
          </Link>
        </nav>
      </div>

      {tab === "mapping" ? (
        <MappingSection
          skillFrameworkId={skillFrameworkId}
          domains={domains}
          competencies={competencies}
          subSkills={subSkills}
          sp={sp}
          createDomain={createSkillDomain.bind(null, skillFrameworkId)}
          updateDomain={updateSkillDomain.bind(null, skillFrameworkId)}
          deleteDomain={deleteSkillDomain.bind(null, skillFrameworkId)}
          reorderDomain={reorderSkillDomain.bind(null, skillFrameworkId)}
          createCompetency={createSkillCompetency.bind(null, skillFrameworkId)}
          updateCompetency={updateSkillCompetency.bind(null, skillFrameworkId)}
          deleteCompetency={deleteSkillCompetency.bind(null, skillFrameworkId)}
          reorderCompetency={reorderSkillCompetency.bind(null, skillFrameworkId)}
          createMapping={createSkillCompetencyMap.bind(null, skillFrameworkId)}
          deleteMapping={deleteSkillCompetencyMap.bind(null, skillFrameworkId)}
          bulkUpdateWeights={bulkUpdateSkillWeights.bind(null, skillFrameworkId)}
        />
      ) : (
        <ReportSection
          skillFrameworkId={skillFrameworkId}
          competencies={competencies}
          sp={sp}
          updateCompetency={updateSkillCompetency.bind(null, skillFrameworkId)}
          updateBandContent={updateSkillCompetencyBandContent.bind(null, skillFrameworkId)}
          upsertProject={upsertSkillDevelopmentProject.bind(null, skillFrameworkId)}
          deleteProject={deleteSkillDevelopmentProject.bind(null, skillFrameworkId)}
        />
      )}
    </main>
  );
}
